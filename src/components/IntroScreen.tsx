import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../lib/audio';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'kurai' | 'circle' | 'open'>('kurai');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    sound.init();

    // Sequence timing
    const t1 = setTimeout(() => {
      setPhase('circle');
    }, 2800);

    const t2 = setTimeout(() => {
      setPhase('open');
      sound.playHitSound();
    }, 6600);

    const t3 = setTimeout(() => {
      onComplete();
    }, 7600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  // Ant animation loop on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Generate orbiting ants
    const antCount = 42;
    const ants = Array.from({ length: antCount }).map((_, i) => ({
      angle: (i / antCount) * Math.PI * 2,
      orbitRadius: 180 + (i % 3) * 22,
      speed: 0.035 + (i % 4) * 0.005,
      size: 7 + (i % 3) * 2,
      legPhase: Math.random() * 10,
    }));

    // Ambient dust particles
    const dust = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Draw dust
      dust.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = width;
        if (d.x > width) d.x = 0;
        if (d.y < 0) d.y = height;
        if (d.y > height) d.y = 0;

        ctx.fillStyle = `rgba(59, 130, 246, ${d.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (phase === 'circle' || phase === 'open') {
        const cx = width / 2;
        const cy = height / 2;

        // Draw glowing circular pheromone trail
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 200, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.25)';
        ctx.lineWidth = 30;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 190, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -frame * 1.5;
        ctx.stroke();
        ctx.restore();

        // Draw ants marching in circle
        ants.forEach((ant) => {
          ant.angle += ant.speed * (phase === 'open' ? 2.5 : 1);
          ant.legPhase += 0.4;

          const ax = cx + Math.cos(ant.angle) * ant.orbitRadius;
          const ay = cy + Math.sin(ant.angle) * ant.orbitRadius;
          // Facing tangent to the circle
          const heading = ant.angle + Math.PI / 2;

          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(heading);

          // Legs
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.5;
          for (let leg = -1; leg <= 1; leg++) {
            const swing = Math.sin(ant.legPhase + leg) * 3;
            // Left leg
            ctx.beginPath();
            ctx.moveTo(0, leg * 3);
            ctx.lineTo(-ant.size - 2, leg * 4 + swing);
            ctx.stroke();

            // Right leg
            ctx.beginPath();
            ctx.moveTo(0, leg * 3);
            ctx.lineTo(ant.size + 2, leg * 4 - swing);
            ctx.stroke();
          }

          // Abdomen (back)
          ctx.fillStyle = '#dc2626'; // red soldier ant
          ctx.beginPath();
          ctx.ellipse(0, -ant.size * 0.7, ant.size * 0.5, ant.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();

          // Thorax (middle)
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.ellipse(0, 0, ant.size * 0.35, ant.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head (front)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.ellipse(0, ant.size * 0.65, ant.size * 0.4, ant.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing eyes
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(-2, ant.size * 0.75, 1.2, 0, Math.PI * 2);
          ctx.arc(2, ant.size * 0.75, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Mandibles
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-2, ant.size * 0.9);
          ctx.lineTo(-3.5, ant.size * 1.3);
          ctx.moveTo(2, ant.size * 0.9);
          ctx.lineTo(3.5, ant.size * 1.3);
          ctx.stroke();

          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [phase]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Skip button */}
      <button
        onClick={() => {
          sound.playClick();
          onComplete();
        }}
        className="absolute bottom-6 right-6 z-30 px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-700/50 backdrop-blur-md text-xs font-mono tracking-widest transition-all cursor-pointer"
      >
        SKIP INTRO [ESC]
      </button>

      <AnimatePresence mode="wait">
        {phase === 'kurai' && (
          <motion.div
            key="kurai"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="z-10 text-center px-4"
          >
            <motion.p
              initial={{ letterSpacing: '0.4em', opacity: 0 }}
              animate={{ letterSpacing: '0.6em', opacity: 0.8 }}
              transition={{ duration: 1.8 }}
              className="text-blue-400 font-mono text-sm uppercase mb-3 font-semibold tracking-widest"
            >
              Misiori
            </motion.p>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 1.0 }}
              className="text-4xl md:text-6xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-600 font-['Russo_One'] drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]"
            >
              PRESENTS
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="h-0.5 w-48 mx-auto mt-4 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            />
          </motion.div>
        )}

        {(phase === 'circle' || phase === 'open') && (
          <motion.div
            key="circle-title"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: phase === 'open' ? 0 : 1,
              scale: phase === 'open' ? 2.2 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 14,
            }}
            className="z-10 text-center max-w-sm px-4"
          >
            <div className="relative flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                className="absolute w-72 h-72 rounded-full border border-blue-500/30 pointer-events-none"
              />

              <h1 className="text-3xl md:text-5xl font-black font-['Russo_One'] tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-blue-100 via-blue-400 to-blue-600 drop-shadow-[0_0_40px_rgba(59,130,246,0.9)] leading-tight">
                DANGEROUS
                <br />
                ANT FARM!
              </h1>
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase mt-3">
                A Game by Misiori
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glass break / open effect on phase === 'open' */}
      {phase === 'open' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0 z-20 bg-amber-500/20 backdrop-blur-md pointer-events-none"
        />
      )}
    </div>
  );
};
