import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Clean handwritten-style SVG icon with 'daf' in lowercase and carelessly circled ring
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="60%" stop-color="#090a0f" />
      <stop offset="100%" stop-color="#050508" />
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Dark Canvas Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />

  <!-- Subtle grid dots in safe zone -->
  <g fill="rgba(255,255,255,0.04)">
    <circle cx="160" cy="160" r="3" />
    <circle cx="256" cy="160" r="3" />
    <circle cx="352" cy="160" r="3" />
    <circle cx="160" cy="352" r="3" />
    <circle cx="256" cy="352" r="3" />
    <circle cx="352" cy="352" r="3" />
  </g>

  <!-- Carelessly circled ring (hand-drawn uneven border) -->
  <path
    d="M 256,76
       C 358,72 436,145 440,248
       C 444,354 362,434 258,438
       C 152,442 74,360 72,254
       C 70,148 150,78 250,76
       C 285,75 320,82 345,96"
    fill="none"
    stroke="#d4d4d8"
    stroke-width="7"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-dasharray="1400"
    stroke-dashoffset="30"
    opacity="0.85"
  />

  <!-- Secondary faint sketch circle line for manuscript effect -->
  <path
    d="M 248,82
       C 350,86 430,155 432,252
       C 434,350 354,428 252,430
       C 160,432 82,352 80,260
       C 78,160 160,84 260,82"
    fill="none"
    stroke="#71717a"
    stroke-width="3"
    stroke-linecap="round"
    opacity="0.4"
  />

  <!-- 'daf' Lowercase Handwritten Lettering -->
  <g filter="url(#glow)">
    <!-- Letter 'd' -->
    <!-- Ascender stem -->
    <path
      d="M 200,165
         C 199,195 198,245 198,310
         C 198,322 201,332 208,336"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="15"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- 'd' circular bowl -->
    <path
      d="M 198,248
         C 186,236 172,230 154,230
         C 130,230 114,248 114,278
         C 114,308 130,326 156,326
         C 174,326 188,318 198,302"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="14"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Letter 'a' -->
    <!-- 'a' bowl -->
    <path
      d="M 284,248
         C 272,236 258,230 240,230
         C 218,230 204,248 204,278
         C 204,308 218,326 242,326
         C 260,326 274,318 284,300"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="14"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- 'a' downward right stem -->
    <path
      d="M 284,232
         L 284,322
         C 284,328 288,332 294,334"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="14"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Letter 'f' -->
    <!-- 'f' crook and long descender/stem -->
    <path
      d="M 374,180
         C 362,165 342,165 334,180
         C 328,192 328,212 328,240
         L 328,345"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="15"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- 'f' crossbar -->
    <path
      d="M 312,246
         L 360,244"
      fill="none"
      stroke="#f4f4f5"
      stroke-width="14"
      stroke-linecap="round"
    />
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.resolve('public');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim());
  console.log('Saved public/icon.svg');

  const svgBuffer = Buffer.from(svgIcon);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Saved pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Saved pwa-512x512.png');

  // 512x512 maskable (with 15% inner padding)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#090a0f',
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Saved pwa-maskable-512x512.png');

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Saved apple-touch-icon.png');

  // favicon.ico (64x64 png as favicon)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Saved favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
