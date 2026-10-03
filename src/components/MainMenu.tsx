import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Volume2,
  VolumeX,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { SkinRenderer } from './SkinRenderer';
import { sound } from '../lib/audio';
import { PWAInstallButton } from './PWAInstallButton';
import { getClaimableCount } from '../lib/dailyChallenges';

export const isMisioriUser = (username?: string, email?: string) => {
  const clean = (username || '').toLowerCase().trim().replace(/^@/, '');
  return clean === 'misiori' || (email && email.toLowerCase() === 'misiori.gg@gmail.com');
};

interface MainMenuProps {
  profile: PlayerProfile;
  onPlayClick: () => void;
  onOpenSkins: () => void;
  onOpenProfile: () => void;
  onOpenDailyChallenges: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  onPlayClick,
  onOpenSkins,
  onOpenProfile,
  onOpenDailyChallenges,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  // Background Canvas: Minimal subtle ambient ants crawling gently
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

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const antCount = 35;
    const ants = Array.from({ length: antCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 2 + 5,
      legPhase: Math.random() * 20,
      opacity: Math.random() * 0.35 + 0.15,
    }));

    const render = () => {
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, width, height);

      // Soft faint grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let x = 30; x < width; x += 40) {
        for (let y = 30; y < height; y += 40) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Draw subtle minimalistic background ants
      ants.forEach((ant) => {
        const dx = mouseX - ant.x;
        const dy = mouseY - ant.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 100 && dist > 5) {
          ant.vx -= (dx / dist) * 0.12;
          ant.vy -= (dy / dist) * 0.12;
        }

        ant.x += ant.vx;
        ant.y += ant.vy;

        if (ant.x < 10) ant.vx = Math.abs(ant.vx);
        if (ant.x > width - 10) ant.vx = -Math.abs(ant.vx);
        if (ant.y < 10) ant.vy = Math.abs(ant.vy);
        if (ant.y > height - 10) ant.vy = -Math.abs(ant.vy);

        const angle = Math.atan2(ant.vy, ant.vx);
        ant.legPhase += 0.2;

        ctx.save();
        ctx.translate(ant.x, ant.y);
        ctx.rotate(angle);
        ctx.fillStyle = `rgba(200, 210, 230, ${ant.opacity})`;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, ant.size * 0.7, ant.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(ant.size * 0.6, 0, ant.size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const claimableCount = getClaimableCount(profile);

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Top Bar: Profile (username + avatar only, no PTS) and audio / pwa */}
      <div className="relative z-20 flex items-center justify-between gap-3 shrink-0 pb-2">
        {/* Profile Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenProfile();
          }}
          className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-[220px_20px_200px_25px/20px_220px_25px_200px] bg-neutral-900/60 hover:bg-neutral-900/90 active:scale-95 border border-neutral-700/60 hover:border-neutral-400 transition-all cursor-pointer backdrop-blur-sm"
        >
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover border border-neutral-600"
              />
            ) : (
              <SkinRenderer skinId={profile.active_skin} size={30} />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-['Patrick_Hand'] text-base text-neutral-200 leading-none">
              {profile.username}
            </span>
            {isMisioriUser(profile.username, profile.email) && (
              <span className="inline-flex items-center justify-center self-center" title="verified @misiori">
                <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-neutral-950 inline-block shrink-0" />
              </span>
            )}
          </div>
        </button>

        {/* Right audio & PWA */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="p-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/60 hover:bg-neutral-900/90 active:scale-95 border border-neutral-700/60 hover:border-neutral-400 text-neutral-400 hover:text-white transition-all cursor-pointer"
            title={isMuted ? 'unmute' : 'mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-neutral-300" />}
          </button>
        </div>
      </div>

      {/* Center: Title manuscript style & Carelessly Circled Play Icon */}
      <div className="relative z-20 flex flex-col items-center justify-center my-auto py-3 text-center px-4 shrink-0">
        {/* Info Button above the title */}
        <button
          onClick={() => {
            sound.playClick();
            setShowHowTo(true);
          }}
          className="mb-2 sm:mb-4 p-1.5 rounded-full bg-neutral-900/40 hover:bg-neutral-800/80 border border-neutral-700/50 hover:border-neutral-500 text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
          title="how to play"
        >
          <Info className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Title in manuscript handwritten font with ! in the end */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="font-['Caveat'] text-4xl sm:text-7xl md:text-8xl font-bold tracking-tight text-neutral-100 mb-4 sm:mb-8 lowercase select-none"
        >
          dangerous ant farm!
        </motion.h1>

        {/* Just a play icon, carelessly circled */}
        <button
          onClick={() => {
            sound.playClick();
            onPlayClick();
          }}
          className="w-16 h-16 sm:w-24 sm:h-24 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] border-2 border-neutral-300/80 hover:border-white bg-neutral-900/40 hover:bg-neutral-800/60 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105 cursor-pointer group"
          title="play"
        >
          <Play className="w-7 h-7 sm:w-10 sm:h-10 fill-white text-white ml-0.5 sm:ml-1 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Bottom Menu Buttons: skins, challenges, profile — handwritten & carelessly circled */}
      <div className="relative z-20 flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 pt-2 pb-1 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onOpenSkins();
          }}
          className="px-5 py-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/50 hover:bg-neutral-900/90 active:scale-95 border border-neutral-700/70 hover:border-neutral-300 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-xl tracking-wide lowercase transition-all cursor-pointer shadow-sm"
        >
          skins
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenDailyChallenges();
          }}
          className="relative px-5 py-2 rounded-[220px_25px_200px_18px/22px_210px_20px_225px] bg-neutral-900/50 hover:bg-neutral-900/90 active:scale-95 border border-neutral-700/70 hover:border-neutral-300 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-xl tracking-wide lowercase transition-all cursor-pointer shadow-sm"
        >
          challenges
          {claimableCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenProfile();
          }}
          className="px-5 py-2 rounded-[240px_18px_230px_20px/18px_235px_18px_240px] bg-neutral-900/50 hover:bg-neutral-900/90 active:scale-95 border border-neutral-700/70 hover:border-neutral-300 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-xl tracking-wide lowercase transition-all cursor-pointer shadow-sm"
        >
          profile
        </button>
      </div>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowHowTo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-[30px_20px_35px_20px/20px_35px_20px_30px] bg-neutral-900 border border-neutral-700/80 p-6 sm:p-8 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowHowTo(false);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="font-['Caveat'] text-3xl sm:text-4xl font-bold text-neutral-100 mb-4 lowercase text-center">
                how to play
              </h2>

              <div className="space-y-4 font-['Patrick_Hand'] text-lg sm:text-xl text-neutral-300 leading-snug">
                <p>
                  run away from ants with ur cursor
                </p>
                <p>
                  destroy anthills to get points
                </p>
                <p>
                  use powerups to enhance ur experience!
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowHowTo(false);
                }}
                className="mt-6 w-full py-2.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-neutral-600 hover:border-neutral-400 text-neutral-200 font-['Patrick_Hand'] text-xl lowercase transition-all cursor-pointer"
              >
                got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};