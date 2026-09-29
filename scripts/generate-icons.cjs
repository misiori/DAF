const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function generate() {
  const fontBuffer = fs.readFileSync('/tmp/Caveat.ttf');
  const font = opentype.parse(fontBuffer.buffer);

  // Generate vector path for lowercase "daf"
  const fontSize = 280;
  const rawPath = font.getPath('daf', 0, 0, fontSize);
  const bbox = rawPath.getBoundingBox();

  const textWidth = bbox.x2 - bbox.x1;
  const textHeight = bbox.y2 - bbox.y1;
  const textCenterX = (bbox.x1 + bbox.x2) / 2;
  const textCenterY = (bbox.y1 + bbox.y2) / 2;

  // Center on 512x512 canvas
  const targetX = 256 - textCenterX;
  const targetY = 256 - textCenterY + 12; // visual vertical optical adjustment for ascenders/descenders

  const centeredPath = font.getPath('daf', targetX, targetY, fontSize);
  const pathData = centeredPath.toPathData(2);

  // High quality SVG icon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#05070f" />
    </radialGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#e0e7ff" />
      <stop offset="100%" stop-color="#93c5fd" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#3b82f6" flood-opacity="0.6" />
      <feDropShadow dx="0" dy="8" stdDeviation="24" flood-color="#1d4ed8" flood-opacity="0.4" />
    </filter>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7" />
    </filter>
  </defs>

  <!-- Dark cyber background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />
  <rect width="496" height="496" x="8" y="8" rx="104" fill="none" stroke="#3b82f6" stroke-width="4" stroke-opacity="0.4" />

  <!-- Subtle ambient decorative rings -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#2563eb" stroke-width="2" stroke-opacity="0.2" stroke-dasharray="8 12" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-opacity="0.2" />

  <!-- Two tiny stylized wandering ant dots (matching terrarium theme) -->
  <g opacity="0.4">
    <ellipse cx="140" cy="130" rx="3.5" ry="2" fill="#93c5fd" transform="rotate(35 140 130)" />
    <ellipse cx="370" cy="380" rx="3.5" ry="2" fill="#93c5fd" transform="rotate(-25 370 380)" />
  </g>

  <!-- Lowercase "daf" in Caveat theme font -->
  <g filter="url(#glow)">
    <path d="${pathData}" fill="url(#textGrad)" />
  </g>
</svg>`;

  // Maskable SVG (with safe-zone margins)
  const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#05070f" />
    </radialGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#e0e7ff" />
      <stop offset="100%" stop-color="#93c5fd" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#3b82f6" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGlow)" />
  <circle cx="256" cy="256" r="200" fill="none" stroke="#2563eb" stroke-width="2" stroke-opacity="0.25" stroke-dasharray="8 12" />

  <!-- Lowercase "daf" scaled slightly for 80% safe zone -->
  <g transform="translate(51.2, 51.2) scale(0.8)" filter="url(#glow)">
    <path d="${pathData}" fill="url(#textGrad)" />
  </g>
</svg>`;

  const publicDir = path.resolve(__dirname, '../public');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
  console.log('Saved icon.svg');

  // Generate PNGs using Sharp
  const svgBuffer = Buffer.from(svgContent);
  const maskableBuffer = Buffer.from(maskableSvgContent);

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Saved pwa-512x512.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Saved pwa-192x192.png');

  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Saved pwa-maskable-512x512.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Saved apple-touch-icon.png');

  // Favicon (48x48 PNG saved as favicon.ico and favicon.png)
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Saved favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
