import React, { useEffect, useRef } from 'react';

interface AmbientAntBackgroundProps {
  opacity?: number;
  antCount?: number;
  themeColor?: string;
}

export const AmbientAntBackground: React.FC<AmbientAntBackgroundProps> = ({
  opacity = 1,
  antCount = 35,
  themeColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        mouseX = (e as MouseEvent).clientX;
        mouseY = (e as MouseEvent).clientY;
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Generate varied ants with multiple castes (scout, worker, soldier, golden)
    const ants = Array.from({ length: antCount }).map(() => {
      const casteRoll = Math.random();
      const caste = casteRoll > 0.85 ? 'soldier' : casteRoll > 0.65 ? 'golden' : casteRoll > 0.4 ? 'scout' : 'worker';
      const size = caste === 'soldier' ? 7.5 : caste === 'scout' ? 3.8 : caste === 'golden' ? 6.2 : 5.2;
      const tint = caste === 'soldier' ? '#f87171' : caste === 'golden' ? '#fbbf24' : caste === 'scout' ? '#38bdf8' : '#cbd5e1';
      const speed = caste === 'scout' ? 1.8 : 1.2;

      return {
        caste,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size,
        legPhase: Math.random() * 20,
        opacity: caste === 'golden' ? 0.35 : Math.random() * 0.25 + 0.15,
        tint,
      };
    });

    // Floating organic terrarium spores & firefly motes
    const spores = Array.from({ length: 32 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 2.2 + 0.8,
      alpha: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.6 ? '#fbbf24' : Math.random() > 0.3 ? '#38bdf8' : '#94a3b8',
      pulse: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.fillStyle = '#080a10';
      ctx.fillRect(0, 0, width, height);

      // Subtle radial vignette
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.2,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85
      );
      grad.addColorStop(0, themeColor ? `${themeColor}15` : 'rgba(15, 23, 42, 0.45)');
      grad.addColorStop(1, 'rgba(4, 6, 11, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Soft faint dot grid (matching manuscript & terrarium aesthetic)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
      const step = 38;
      for (let x = 20; x < width; x += step) {
        for (let y = 20; y < height; y += step) {
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }

      // Spores & bioluminescent motes drifting gently
      spores.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.pulse += 0.03;
        if (sp.y < 0) sp.y = height;
        if (sp.x < 0) sp.x = width;
        if (sp.x > width) sp.x = 0;

        const currentAlpha = sp.alpha * (0.7 + 0.3 * Math.sin(sp.pulse));
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Ambient wandering ants
      ants.forEach((ant) => {
        const dx = mouseX - ant.x;
        const dy = mouseY - ant.y;
        const dist = Math.hypot(dx, dy);

        // Gently scurry away if cursor/finger gets near
        if (dist < 90 && dist > 2) {
          ant.vx -= (dx / dist) * 0.14;
          ant.vy -= (dy / dist) * 0.14;
        }

        // Slight natural wandering wander
        ant.vx += (Math.random() - 0.5) * 0.08;
        ant.vy += (Math.random() - 0.5) * 0.08;

        // Speed limit
        const spd = Math.hypot(ant.vx, ant.vy);
        if (spd > 1.8) {
          ant.vx = (ant.vx / spd) * 1.8;
          ant.vy = (ant.vy / spd) * 1.8;
        }

        ant.x += ant.vx;
        ant.y += ant.vy;

        // Screen wrap or bounce
        if (ant.x < -15) ant.x = width + 10;
        if (ant.x > width + 15) ant.x = -10;
        if (ant.y < -15) ant.y = height + 10;
        if (ant.y > height + 15) ant.y = -10;

        const angle = Math.atan2(ant.vy, ant.vx);
        ant.legPhase += 0.25;

        ctx.save();
        ctx.translate(ant.x, ant.y);
        ctx.rotate(angle);

        // Subtle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(1, 1, ant.size * 0.65, ant.size * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ant Body
        ctx.fillStyle = ant.tint;
        ctx.globalAlpha = ant.opacity;

        // Abdomen
        ctx.beginPath();
        ctx.ellipse(-ant.size * 0.45, 0, ant.size * 0.5, ant.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax
        ctx.beginPath();
        ctx.ellipse(0, 0, ant.size * 0.3, ant.size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(ant.size * 0.45, 0, ant.size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Little feelers
        ctx.strokeStyle = ant.tint;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ant.size * 0.5, -ant.size * 0.1);
        ctx.lineTo(ant.size * 0.8, -ant.size * 0.3);
        ctx.moveTo(ant.size * 0.5, ant.size * 0.1);
        ctx.lineTo(ant.size * 0.8, ant.size * 0.3);
        ctx.stroke();

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [antCount, themeColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="absolute inset-0 pointer-events-none z-0 block w-full h-full"
    />
  );
};
