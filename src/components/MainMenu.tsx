import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  ShoppingBag,
  Palette,
  User,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { SkinRenderer } from './SkinRenderer';
import { sound } from '../lib/audio';
import { PWAInstallButton } from './PWAInstallButton';
import { SKINS } from '../lib/constants';
import { getClaimableCount } from '../lib/dailyChallenges';

export const isMisioriUser = (username?: string, email?: string) => {
  const clean = (username || '').toLowerCase().trim().replace(/^@/, '');
  return clean === 'misiori' || (email && email.toLowerCase() === 'misiori.gg@gmail.com');
};

interface MainMenuProps {
  profile: PlayerProfile;
  onPlayClick: () => void;
  onOpenShop: () => void;
  onOpenSkins: () => void;
  onOpenProfile: () => void;
  onOpenDailyChallenges: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  onPlayClick,
  onOpenShop,
  onOpenSkins,
  onOpenProfile,
  onOpenDailyChallenges,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background Canvas: Ants running around dynamically in the terrarium!
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
    window.addEventListener('mousemove', handleMouseMove);

    // Terrarium ants running freely in the background
    const antCount = 65;
    const ants = Array.from({ length: antCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      size: Math.random() * 3 + 6,
      legPhase: Math.random() * 20,
      color: Math.random() > 0.4 ? '#3b82f6' : Math.random() > 0.5 ? '#1d4ed8' : '#06b6d4',
      carryingFood: Math.random() > 0.7,
    }));

    // Food crumbs scattered around
    const crumbs = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 2,
    }));

    const render = () => {
      // Clear with dark blue-black underground gradient
      ctx.fillStyle = '#050c18';
      ctx.fillRect(0, 0, width, height);

      // Cyber terrarium sand / specks
      ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc((i * 123) % width, (i * 321) % height, (i % 4) + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw crumbs (blue bio-luminescent sugar)
      ctx.fillStyle = 'rgba(96, 165, 250, 0.7)';
      crumbs.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw ants
      ants.forEach((ant) => {
        const dx = mouseX - ant.x;
        const dy = mouseY - ant.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 150) {
          ant.vx -= (dx / dist) * 0.25;
          ant.vy -= (dy / dist) * 0.25;
        } else {
          ant.vx += (Math.random() - 0.5) * 0.3;
          ant.vy += (Math.random() - 0.5) * 0.3;
        }

        const spd = Math.hypot(ant.vx, ant.vy);
        const maxSpd = 3.5;
        if (spd > maxSpd) {
          ant.vx = (ant.vx / spd) * maxSpd;
          ant.vy = (ant.vy / spd) * maxSpd;
        }

        ant.x += ant.vx;
        ant.y += ant.vy;
        ant.legPhase += 0.35;

        if (ant.x < 10) ant.vx = Math.abs(ant.vx);
        if (ant.x > width - 10) ant.vx = -Math.abs(ant.vx);
        if (ant.y < 10) ant.vy = Math.abs(ant.vy);
        if (ant.y > height - 10) ant.vy = -Math.abs(ant.vy);

        const angle = Math.atan2(ant.vy, ant.vx);

        ctx.save();
        ctx.translate(ant.x, ant.y);
        ctx.rotate(angle);

        // Legs
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 1.2;
        for (let l = -1; l <= 1; l++) {
          const legWiggle = Math.sin(ant.legPhase + l) * 3;
          ctx.beginPath();
          ctx.moveTo(l * 3, 0);
          ctx.lineTo(l * 4, -ant.size - 2 + legWiggle);
          ctx.moveTo(l * 3, 0);
          ctx.lineTo(l * 4, ant.size + 2 - legWiggle);
          ctx.stroke();
        }

        // Abdomen
        ctx.fillStyle = ant.color;
        ctx.beginPath();
        ctx.ellipse(-ant.size * 0.7, 0, ant.size * 0.7, ant.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, 0, ant.size * 0.4, ant.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = ant.color;
        ctx.beginPath();
        ctx.ellipse(ant.size * 0.65, 0, ant.size * 0.4, ant.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        if (ant.carryingFood) {
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(ant.size * 0.9, -2, 4, 4);
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const totalPts =
    Object.values(profile.high_scores || {}).reduce((a, b) => a + (Number(b) || 0), 0) +
    (profile.bonus_pts || 0);

  const claimableCount = getClaimableCount(profile);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Background Terrarium Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Terrarium Glass Border Vignette */}
      <div className="absolute inset-0 border-[10px] border-blue-950/40 pointer-events-none z-10 rounded-2xl shadow-[inset_0_0_80px_rgba(3,7,18,0.9)]" />

      {/* Top Bar: Profile, Daily Challenges Quick Button, PWA Install, Audio */}
      <div className="relative z-20 flex items-center justify-between flex-wrap gap-2">
        {/* Profile Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenProfile();
          }}
          className="flex items-center gap-3 p-2 pr-4 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800/90 border border-blue-800/50 backdrop-blur-md transition-all cursor-pointer shadow-lg hover:border-blue-400/70"
        >
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-xl object-cover border border-blue-400 shadow-md shadow-blue-500/20"
              />
            ) : (
              <SkinRenderer skinId={profile.active_skin} size={38} />
            )}
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <span className="leading-none">{profile.username}</span>
              {isMisioriUser(profile.username, profile.email) && (
                <span className="inline-flex items-center justify-center self-center" title="Verified @misiori">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-neutral-950 inline-block shrink-0" />
                </span>
              )}
              <span className="text-[10px] text-blue-400 font-semibold px-1.5 py-0.2 bg-blue-950 rounded border border-blue-800 leading-none">
                {totalPts.toLocaleString()} PTS
              </span>
            </div>
          </div>
        </button>

        {/* Right Controls: Daily Challenges, PWA Install Button & Audio */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onOpenDailyChallenges();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-950/80 hover:bg-blue-900/90 border border-blue-500/50 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-950/50 hover:border-blue-400 group"
          >
            <Flame className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">DAILY CHALLENGES</span>
            <span className="sm:hidden">DAILY</span>
            {claimableCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-neutral-950 text-[10px] font-black animate-bounce">
                {claimableCount} CLAIM
              </span>
            ) : (
              <span className="text-[10px] text-blue-300 font-semibold px-1 bg-blue-900/60 rounded">
                +1,000+ PTS
              </span>
            )}
          </button>

          <PWAInstallButton />

          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="p-2.5 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800 border border-blue-800/50 backdrop-blur-md text-neutral-300 hover:text-white transition-all cursor-pointer shadow-md"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Center: Title & Huge Play Button */}
      <div className="relative z-20 flex flex-col items-center justify-center my-auto text-center px-4">
        {/* Misiori Studio badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900/80 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold tracking-widest uppercase mb-4 backdrop-blur-md shadow-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          A GAME BY MISIORI
        </motion.div>

        {/* Title in Electric Blue */}
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black font-['Russo_One'] tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-blue-100 via-blue-400 to-blue-600 drop-shadow-[0_0_40px_rgba(59,130,246,0.7)] leading-none mb-3"
        >
          DANGEROUS
          <br />
          ANT FARM
        </motion.h1>

        <p className="text-xs sm:text-sm font-mono text-neutral-300 tracking-wider max-w-md drop-shadow">
          Rhythm-dodge survival: ants chase your cursor while dynamic speed portals shift the tempo.
        </p>

        {/* Big PLAY Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            sound.playClick();
            onPlayClick();
          }}
          className="mt-8 px-12 py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black font-['Russo_One'] text-2xl tracking-widest shadow-[0_0_40px_rgba(59,130,246,0.6)] border border-blue-300 transition-all cursor-pointer flex items-center gap-4 group"
        >
          <Play className="w-8 h-8 fill-current transition-transform group-hover:scale-110" />
          PLAY GAME
        </motion.button>
      </div>

      {/* Side / Bottom Buttons: Shop, Skins (28), Daily Challenges, Profile */}
      <div className="relative z-20 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={() => {
            sound.playClick();
            onOpenShop();
          }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800 border border-blue-900/50 hover:border-blue-500/50 backdrop-blur-md text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <ShoppingBag className="w-4 h-4 text-blue-400" />
          SHOP (COMING SOON)
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenSkins();
          }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800 border border-blue-900/50 hover:border-blue-500/50 backdrop-blur-md text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <Palette className="w-4 h-4 text-cyan-400" />
          CURSOR SKINS
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenDailyChallenges();
          }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800 border border-blue-900/50 hover:border-blue-500/50 backdrop-blur-md text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <Flame className="w-4 h-4 text-rose-400" />
          DAILY CHALLENGES (+1,000+ PTS)
          {claimableCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenProfile();
          }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-neutral-900/85 hover:bg-neutral-800 border border-blue-900/50 hover:border-blue-500/50 backdrop-blur-md text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <User className="w-4 h-4 text-indigo-400" />
          PROFILE & LEADERBOARD
        </button>
      </div>
    </div>
  );
};
