import { Skin } from '../types/game';

/**
 * Draws the distinctive geometric shape of each skin directly onto the HTML5 Canvas.
 * Matches the visual design from SkinRenderer.tsx so player shapes are actually in the levels.
 */
export function drawPlayerSkin(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  x: number,
  y: number,
  size: number = 16,
  time: number = 0
) {
  ctx.save();
  ctx.translate(x, y);

  // Soft glow
  ctx.shadowColor = skin.glowColor || skin.color;
  ctx.shadowBlur = 10;

  const s = size; // radius multiplier (e.g. 14-16px)

  switch (skin.id) {
    case 'amber': {
      // Hexagon with center circle and 4 radial tick marks
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}25`;
      drawPolygon(ctx, 0, 0, s, 6);
      ctx.fill();
      ctx.stroke();

      // Center core
      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // White pip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Cross ticks
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, -s * 0.85);
      ctx.moveTo(0, s * 0.5);
      ctx.lineTo(0, s * 0.85);
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(-s * 0.85, 0);
      ctx.moveTo(s * 0.5, 0);
      ctx.lineTo(s * 0.85, 0);
      ctx.stroke();
      break;
    }

    case 'golden_amber': {
      // Double hexagon with vertex dots
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}35`;
      drawPolygon(ctx, 0, 0, s, 6);
      ctx.fill();
      ctx.stroke();

      // Inner inverted hexagon
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      drawPolygon(ctx, 0, 0, s * 0.6, 6, Math.PI / 6);
      ctx.stroke();

      // 6 vertex beads
      ctx.fillStyle = skin.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * s, Math.sin(ang) * s, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'crimson': {
      // Dashed outer ring with top/bottom curved jaws
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.fillStyle = `${skin.color}25`;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Top & bottom arcs
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.6, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.2, s * 0.6, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();

      ctx.fillStyle = skin.color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'forest_moss': {
      // Ring + 4-pointed curved star leaf
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}25`;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4-pointed organic leaf star
      ctx.fillStyle = skin.secondaryColor;
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.quadraticCurveTo(s * 0.25, -s * 0.25, s * 0.85, 0);
      ctx.quadraticCurveTo(s * 0.25, s * 0.25, 0, s * 0.85);
      ctx.quadraticCurveTo(-s * 0.25, s * 0.25, -s * 0.85, 0);
      ctx.quadraticCurveTo(-s * 0.25, -s * 0.25, 0, -s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cyan': {
      // Tech reticle with corner brackets and inner dashed ring
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // 4 corner reticle brackets
      const b = s * 0.9;
      const bl = s * 0.35;
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      // Top-left
      ctx.beginPath();
      ctx.moveTo(-b, -b + bl);
      ctx.lineTo(-b, -b);
      ctx.lineTo(-b + bl, -b);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(b - bl, -b);
      ctx.lineTo(b, -b);
      ctx.lineTo(b, -b + bl);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(-b, b - bl);
      ctx.lineTo(-b, b);
      ctx.lineTo(-b + bl, b);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(b - bl, b);
      ctx.lineTo(b, b);
      ctx.lineTo(b, b - bl);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'toxic': {
      // Rotated 45-deg diamond with hazard spheres
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}35`;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3 hazard nodes
      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, -s * 0.45, s * 0.22, 0, Math.PI * 2);
      ctx.arc(-s * 0.4, s * 0.35, s * 0.22, 0, Math.PI * 2);
      ctx.arc(s * 0.4, s * 0.35, s * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'amethyst': {
      // 10-pointed crystal star
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}40`;
      drawStar(ctx, 0, 0, 5, s, s * 0.45);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'solar_flare': {
      // Sun disc with 8 radiant flares
      ctx.fillStyle = skin.color;
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 8 rays
      ctx.strokeStyle = skin.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + time * 0.5;
        const r1 = s * 0.7;
        const r2 = i % 2 === 0 ? s * 1.15 : s * 0.95;
        ctx.lineWidth = i % 2 === 0 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'glacial_cryo': {
      // Snowflake with 4 cross-axes
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s);
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      const diag = s * 0.72;
      ctx.beginPath();
      ctx.moveTo(-diag, -diag);
      ctx.lineTo(diag, diag);
      ctx.moveTo(-diag, diag);
      ctx.lineTo(diag, -diag);
      ctx.stroke();

      ctx.fillStyle = `${skin.color}50`;
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'emerald_matrix': {
      // Cyber square with dashed border and 4 corner nodes
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.fillStyle = `${skin.color}25`;
      ctx.strokeRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
      ctx.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
      ctx.restore();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(0, s * 0.8);
      ctx.stroke();

      // Corner nodes
      ctx.fillStyle = skin.color;
      const cn = s * 0.55;
      [-cn, cn].forEach((cx) => {
        [-cn, cn].forEach((cy) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'obsidian_shadow': {
      // Angular kite diamond
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.9, 0);
      ctx.lineTo(0, s * 1.1);
      ctx.lineTo(-s * 0.9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner facet
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = `${skin.color}40`;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(0, s * 0.6);
      ctx.lineTo(-s * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'synthwave_pink': {
      // Retro pyramid triangle with horizontal lines
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}35`;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.95, s * 0.8);
      ctx.lineTo(-s * 0.95, s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horizontal synth lines
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, s * 0.35);
      ctx.lineTo(s * 0.65, s * 0.35);
      ctx.moveTo(-s * 0.4, -s * 0.1);
      ctx.lineTo(s * 0.4, -s * 0.1);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, s * 0.2, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'electric_volt': {
      // Circular dashed frame containing lightning bolt
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Lightning bolt
      ctx.fillStyle = skin.secondaryColor;
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.85);
      ctx.lineTo(-s * 0.45, -0.1);
      ctx.lineTo(s * 0.1, -0.1);
      ctx.lineTo(-s * 0.2, s * 0.85);
      ctx.lineTo(s * 0.5, -0.2);
      ctx.lineTo(0, -0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.15, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'radioactive_waste': {
      // Nuclear trefoil symbol
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();

      // 3 Trefoil fan blades
      ctx.fillStyle = skin.color;
      for (let i = 0; i < 3; i++) {
        const ang = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, s * 0.9, ang - 0.45, ang + 0.45);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'magma_core': {
      // Heavy volcanic heptagon with concentric molten core
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#450a0a';
      drawPolygon(ctx, 0, 0, s, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bio_nanite': {
      // Nanotech dashed ring + diagonal crossbars + corner nodes
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      const n = s * 0.6;
      ctx.beginPath();
      ctx.moveTo(-n, -n);
      ctx.lineTo(n, n);
      ctx.moveTo(-n, n);
      ctx.lineTo(n, -n);
      ctx.stroke();

      ctx.fillStyle = skin.color;
      [-n, n].forEach((nx) => {
        [-n, n].forEach((ny) => {
          ctx.beginPath();
          ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Center rotated microchip diamond
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.25);
      ctx.lineTo(s * 0.25, 0);
      ctx.lineTo(0, s * 0.25);
      ctx.lineTo(-s * 0.25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'chrono_brass': {
      // Clock gear with 6 teeth and clock hands
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}25`;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gear teeth
      ctx.fillStyle = skin.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * s * 0.9, Math.sin(ang) * s * 0.9, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Clock hands
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 0.6);
      ctx.stroke();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.45, 0);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'ghost_phantom': {
      // Ghostly hooded silhouette with dark eye sockets
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}45`;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, s * 0.6);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.5, -s * 0.4, -s * 0.9, 0, -s * 0.9);
      ctx.bezierCurveTo(s * 0.4, -s * 0.9, s * 0.7, -s * 0.5, s * 0.7, s * 0.6);
      ctx.bezierCurveTo(s * 0.5, s * 0.4, s * 0.3, s * 0.6, 0, s * 0.4);
      ctx.bezierCurveTo(-s * 0.3, s * 0.6, -s * 0.5, s * 0.4, -s * 0.7, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye sockets
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-s * 0.28, -s * 0.2, 2.5, 0, Math.PI * 2);
      ctx.arc(s * 0.28, -s * 0.2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-s * 0.26, -s * 0.22, 1, 0, Math.PI * 2);
      ctx.arc(s * 0.26, -s * 0.22, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'blood_moon': {
      // Dark orb + crescent moon arc
      ctx.fillStyle = '#2d0606';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crescent moon
      ctx.fillStyle = skin.color;
      ctx.beginPath();
      ctx.arc(0, 0, s, -Math.PI / 2, Math.PI / 2, false);
      ctx.arc(s * 0.3, 0, s * 0.8, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(-s * 0.15, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-s * 0.15, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deep_nebula': {
      // Cosmic loops with orbital rings
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Dual waves
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'quantum_pulsar': {
      // 4-pointed pulsar star with sharp blades
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `${skin.color}60`;
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.15);
      ctx.lineTo(s * 0.25, -s * 0.25);
      ctx.lineTo(s * 1.15, 0);
      ctx.lineTo(s * 0.25, s * 0.25);
      ctx.lineTo(0, s * 1.15);
      ctx.lineTo(-s * 0.25, s * 0.25);
      ctx.lineTo(-s * 1.15, 0);
      ctx.lineTo(-s * 0.25, -s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'prism_rainbow': {
      // Refractive equilateral prism triangle
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}40`;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.05);
      ctx.lineTo(s * 0.95, s * 0.75);
      ctx.lineTo(-s * 0.95, s * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dispersion lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, s * 0.05);
      ctx.lineTo(s * 0.45, s * 0.05);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, s * 0.4);
      ctx.lineTo(s * 0.65, s * 0.4);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'aurora_spirit': {
      // Dual sinusoidal waves inside luminous orb
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = `${skin.color}35`;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Oscillating wave 1
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, -s * 0.2);
      ctx.bezierCurveTo(-s * 0.25, s * 0.4, s * 0.25, -s * 0.4, s * 0.75, s * 0.2);
      ctx.stroke();

      // Oscillating wave 2
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, s * 0.2);
      ctx.bezierCurveTo(-s * 0.25, -s * 0.4, s * 0.25, s * 0.4, s * 0.75, -s * 0.2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'carbon_titanium': {
      // Beveled titanium armor hexagon with core
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = '#1e293b';
      drawPolygon(ctx, 0, 0, s, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = `${skin.color}35`;
      drawPolygon(ctx, 0, 0, s * 0.65, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'queen_regalia': {
      // Royal crest with 5-pointed crown coronet
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}40`;
      drawPolygon(ctx, 0, 0, s, 7);
      ctx.fill();
      ctx.stroke();

      // Crown spikes
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, s * 0.1);
      ctx.lineTo(-s * 0.35, -s * 0.5);
      ctx.lineTo(0, -s * 0.1);
      ctx.lineTo(s * 0.35, -s * 0.5);
      ctx.lineTo(s * 0.6, s * 0.1);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, s * 0.25, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'celestial_sovereign': {
      // Halo + spread angelic wing crest
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -s * 0.65, s * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      // Wings
      ctx.fillStyle = `${skin.color}50`;
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.9, s * 0.3, 0, s * 0.7);
      ctx.bezierCurveTo(-s * 0.9, s * 0.3, -s * 0.9, -s * 0.6, 0, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, s * 0.1, s * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'dark_singularity': {
      // Black hole + tilted accretion disc
      ctx.save();
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Accretion ellipse
      ctx.save();
      ctx.rotate(-Math.PI / 6);
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Void core
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'hyper_drive': {
      // Starfighter chevron arrowhead
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}45`;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.15);
      ctx.lineTo(s * 0.85, s * 0.85);
      ctx.lineTo(0, s * 0.35);
      ctx.lineTo(-s * 0.85, s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner chevron
      ctx.strokeStyle = skin.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(s * 0.5, s * 0.55);
      ctx.lineTo(0, s * 0.25);
      ctx.lineTo(-s * 0.5, s * 0.55);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Default: Clean cyber diamond-hexagon with core
      ctx.strokeStyle = skin.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = `${skin.color}35`;
      drawPolygon(ctx, 0, 0, s, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number = -Math.PI / 2
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  points: number,
  outerRadius: number,
  innerRadius: number
) {
  ctx.beginPath();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
