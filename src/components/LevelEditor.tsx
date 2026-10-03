import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Trash2,
  Palette,
  ShieldAlert,
  Flame,
  Zap,
  Upload,
  Plus,
  Compass,
  RotateCcw,
  Sparkles,
  Info,
  Monitor,
} from 'lucide-react';
import {
  CustomLevel,
  CustomAnthillPlacement,
  CustomCocoonPlacement,
  PowerUpChances,
  THEME_COLOR_PRESETS,
  saveDraftLevel,
  publishCustomLevel,
  isMobileDevice,
} from '../lib/customLevels';
import { PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';

interface LevelEditorProps {
  initialLevel?: CustomLevel | null;
  profile: PlayerProfile;
  onSave: (level: CustomLevel) => void;
  onVerifyAndPlay: (level: CustomLevel) => void;
  onBack: () => void;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({
  initialLevel,
  profile,
  onSave,
  onVerifyAndPlay,
  onBack,
}) => {
  const [levelId] = useState(
    initialLevel?.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [name, setName] = useState(initialLevel?.name || 'my chamber');
  const [themeColor, setThemeColor] = useState(initialLevel?.themeColor || '#38bdf8');
  const [anthills, setAnthills] = useState<CustomAnthillPlacement[]>(
    initialLevel?.anthills || [
      { id: 1, xFrac: 0.3, yFrac: 0.4, type: 'standard', hp: 3 },
      { id: 2, xFrac: 0.7, yFrac: 0.6, type: 'standard', hp: 3 },
    ]
  );
  const [cocoons, setCocoons] = useState<CustomCocoonPlacement[]>(
    initialLevel?.cocoons || [{ id: 1, xFrac: 0.5, yFrac: 0.3, hp: 6 }]
  );
  const [bossCount, setBossCount] = useState<number>(initialLevel?.bossCount ?? 1);
  const [powerUpChances, setPowerUpChances] = useState<PowerUpChances>(
    initialLevel?.powerUpChances || {
      speed: 60,
      honeyTraps: 50,
      nukeBomb: 40,
      freezeBomb: 40,
    }
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(
    initialLevel?.durationSeconds ?? 40
  );
  const [verified, setVerified] = useState<boolean>(initialLevel?.verified ?? false);
  const [published, setPublished] = useState<boolean>(initialLevel?.published ?? false);

  // Editor placement tool
  const [activeTool, setActiveTool] = useState<'anthill' | 'cocoon' | 'erase'>('anthill');
  const [anthillType, setAnthillType] = useState<'standard' | 'fire' | 'acid'>('standard');
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const arenaRef = useRef<HTMLDivElement | null>(null);

  // Construct current level object
  const getCurrentLevel = (): CustomLevel => ({
    id: levelId,
    name: name.trim().toLowerCase() || 'unnamed chamber',
    creatorId: profile.id,
    creatorUsername: profile.username || 'creator',
    creatorAvatarUrl: profile.avatar_url,
    themeColor,
    bgColor: '#090a0f',
    anthills,
    cocoons,
    bossCount,
    powerUpChances,
    durationSeconds,
    difficulty: initialLevel?.difficulty || 'Unrated',
    verified,
    published,
    plays: initialLevel?.plays || 0,
    createdAt: initialLevel?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Handle click on the interactive placement arena
  const handleArenaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Relative fraction (0.0 to 1.0 clamped with padding)
    const rawX = clickX / rect.width;
    const rawY = clickY / rect.height;
    const xFrac = Math.max(0.1, Math.min(0.9, Number(rawX.toFixed(2))));
    const yFrac = Math.max(0.12, Math.min(0.88, Number(rawY.toFixed(2))));

    if (activeTool === 'erase') {
      // Find closest item within threshold
      const hitHillIdx = anthills.findIndex(
        (h) => Math.hypot(h.xFrac - xFrac, h.yFrac - yFrac) < 0.08
      );
      if (hitHillIdx >= 0) {
        sound.playZap();
        const updated = [...anthills];
        updated.splice(hitHillIdx, 1);
        setAnthills(updated);
        setVerified(false); // changing layout requires re-verification
        return;
      }
      const hitCocoonIdx = cocoons.findIndex(
        (c) => Math.hypot(c.xFrac - xFrac, c.yFrac - yFrac) < 0.08
      );
      if (hitCocoonIdx >= 0) {
        sound.playZap();
        const updated = [...cocoons];
        updated.splice(hitCocoonIdx, 1);
        setCocoons(updated);
        setVerified(false);
        return;
      }
      return;
    }

    if (activeTool === 'anthill') {
      if (anthills.length >= 8) {
        sound.playHitSound();
        return;
      }
      sound.playClick();
      const newHill: CustomAnthillPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        type: anthillType,
        hp: 3,
      };
      setAnthills([...anthills, newHill]);
      setVerified(false);
    } else if (activeTool === 'cocoon') {
      if (cocoons.length >= 4) {
        sound.playHitSound();
        return;
      }
      sound.playClick();
      const newCocoon: CustomCocoonPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        hp: 6,
      };
      setCocoons([...cocoons, newCocoon]);
      setVerified(false);
    }
  };

  const handleSaveDraft = async () => {
    sound.playClick();
    const lvl = getCurrentLevel();
    await saveDraftLevel(lvl, profile);
    onSave(lvl);
    setPublishMessage('draft saved successfully!');
    setTimeout(() => setPublishMessage(null), 2500);
  };

  const handleVerify = async () => {
    sound.playClick();
    if (anthills.length === 0) {
      setPublishError('place at least 1 anthill to verify your chamber!');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }
    const lvl = getCurrentLevel();
    await saveDraftLevel(lvl, profile);
    onVerifyAndPlay(lvl);
  };

  const handlePublish = async () => {
    sound.playClick();
    if (!verified) {
      setPublishError('you must verify this level 100% without noclip first!');
      setTimeout(() => setPublishError(null), 3500);
      return;
    }
    if (!name.trim()) {
      setPublishError('please enter a name for your chamber!');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }

    setPublishing(true);
    setPublishError(null);
    const lvl = getCurrentLevel();
    const res = await publishCustomLevel(lvl, profile);
    setPublishing(false);

    if (res.success) {
      setPublished(true);
      sound.playVictory();
      setPublishMessage('chamber published to the public library!');
      setTimeout(() => {
        setPublishMessage(null);
        onBack();
      }, 2000);
    } else {
      setPublishError(res.error || 'failed to publish chamber');
    }
  };

  if (isMobileDevice()) {
    return (
      <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-neutral-100 flex flex-col items-center justify-center p-6 text-center select-none overscroll-none space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-300">
          <Monitor className="w-8 h-8" />
        </div>
        <h2 className="font-['Caveat'] text-4xl text-neutral-200 lowercase">
          sorry! u can build just on computers.
        </h2>
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="px-6 py-2 rounded-2xl bg-neutral-100 text-neutral-950 font-['Patrick_Hand'] text-lg font-bold cursor-pointer hover:bg-white"
        >
          back
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-neutral-100 flex flex-col p-3 sm:p-5 select-none overscroll-none">
      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between pb-2 border-b border-neutral-800 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer font-['Patrick_Hand'] text-base lowercase"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
          <span>ur levels</span>
        </button>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setVerified(false);
            }}
            maxLength={28}
            placeholder="name ur chamber..."
            className="px-3 py-1 bg-neutral-950 border border-neutral-700 focus:border-white rounded-xl text-center font-['Caveat'] text-2xl sm:text-3xl text-white outline-none lowercase placeholder-neutral-600 transition-all w-48 sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-1.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-base lowercase cursor-pointer"
          >
            save draft
          </button>
        </div>
      </div>

      {/* Main Editor Grid: Left = Arena & Placer, Right = Power-ups & Settings */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2.5 overflow-hidden">
        {/* Left Column: Interactive Arena Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-neutral-950/70 border border-neutral-800 rounded-3xl p-3 sm:p-4">
          {/* Tool Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-neutral-800/80 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('anthill');
                }}
                className={`px-3 py-1 rounded-xl font-['Patrick_Hand'] text-sm lowercase flex items-center gap-1.5 cursor-pointer border transition-all ${
                  activeTool === 'anthill'
                    ? 'bg-neutral-100 text-neutral-950 font-bold border-white'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <span>+ anthill ({anthills.length}/8)</span>
              </button>

              {activeTool === 'anthill' && (
                <div className="flex items-center gap-1 pl-1">
                  {(['standard', 'fire', 'acid'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        sound.playClick();
                        setAnthillType(t);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-['Patrick_Hand'] lowercase border ${
                        anthillType === t
                          ? t === 'fire'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                            : t === 'acid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-neutral-900/60 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('cocoon');
                }}
                className={`px-3 py-1 rounded-xl font-['Patrick_Hand'] text-sm lowercase flex items-center gap-1.5 cursor-pointer border transition-all ${
                  activeTool === 'cocoon'
                    ? 'bg-rose-500 text-white font-bold border-rose-400'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <span>+ cocoon ({cocoons.length}/4)</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('erase');
                }}
                className={`px-2.5 py-1 rounded-xl font-['Patrick_Hand'] text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
                  activeTool === 'erase'
                    ? 'bg-red-500/20 text-red-300 border-red-400 font-bold'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-white'
                }`}
                title="click placed item to remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>erase</span>
              </button>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setAnthills([]);
                setCocoons([]);
                setVerified(false);
              }}
              className="text-xs font-['Patrick_Hand'] text-neutral-500 hover:text-rose-400 lowercase cursor-pointer"
            >
              clear all
            </button>
          </div>

          {/* Interactive Arena Area */}
          <div
            ref={arenaRef}
            onClick={handleArenaClick}
            className="relative flex-1 w-full rounded-2xl bg-[#090a0f] border-2 cursor-crosshair overflow-hidden shadow-inner flex items-center justify-center"
            style={{
              borderColor: themeColor,
              boxShadow: `0 0 25px ${themeColor}25 inset`,
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                backgroundPosition: '0 0, 14px 14px',
              }}
            />

            {/* Arena center label */}
            <div className="absolute text-center pointer-events-none opacity-20">
              <span className="font-['Caveat'] text-2xl lowercase tracking-wider text-neutral-400">
                arena playground • click to place
              </span>
            </div>

            {/* Placed Anthills */}
            {anthills.map((hill, i) => (
              <div
                key={hill.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none group"
                style={{
                  left: `${hill.xFrac * 100}%`,
                  top: `${hill.yFrac * 100}%`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                  style={{
                    borderColor: themeColor,
                    backgroundColor: `${themeColor}22`,
                    boxShadow: `0 0 14px ${themeColor}50`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-black/80 border"
                    style={{ borderColor: themeColor }}
                  />
                </div>
                <span className="text-[10px] font-['Patrick_Hand'] text-neutral-300 bg-black/70 px-1 rounded mt-0.5 lowercase whitespace-nowrap">
                  hill #{i + 1} ({hill.type})
                </span>
              </div>
            ))}

            {/* Placed Cocoons */}
            {cocoons.map((cocoon, i) => (
              <div
                key={cocoon.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{
                  left: `${cocoon.xFrac * 100}%`,
                  top: `${cocoon.yFrac * 100}%`,
                }}
              >
                <div className="w-8 h-11 rounded-[50%] bg-pink-950/90 border-2 border-pink-400 flex items-center justify-center shadow-lg shadow-pink-900/40">
                  <div className="w-2.5 h-5 rounded-[50%] bg-pink-500/60 animate-pulse" />
                </div>
                <span className="text-[10px] font-['Patrick_Hand'] text-pink-300 bg-black/70 px-1 rounded mt-0.5 lowercase">
                  cocoon #{i + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs font-['Patrick_Hand'] text-neutral-400 flex items-center justify-between lowercase shrink-0">
            <span>
              tip: select tool then tap inside the box to place or erase elements
            </span>
            <span className="text-neutral-500">
              {anthills.length} hills • {cocoons.length} cocoons
            </span>
          </div>
        </div>

        {/* Right Column: Settings, Theme Color, Power-Up Chances, Boss Count (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-neutral-950/70 border border-neutral-800 rounded-3xl p-3 sm:p-4 overflow-y-auto space-y-4">
          {/* Theme Color Picker */}
          <div>
            <label className="text-sm font-['Patrick_Hand'] text-neutral-300 flex items-center justify-between lowercase mb-2">
              <span className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-cyan-400" />
                theme color
              </span>
              <span className="text-xs text-neutral-500 uppercase">{themeColor}</span>
            </label>

            <div className="grid grid-cols-9 gap-1.5 mb-2">
              {THEME_COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    sound.playClick();
                    setThemeColor(p.color);
                  }}
                  className={`w-full aspect-square rounded-xl transition-all cursor-pointer border ${
                    themeColor === p.color
                      ? 'border-white scale-110 shadow-md ring-2 ring-white/40'
                      : 'border-neutral-800 hover:scale-105'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                or pick custom hex color
              </span>
            </div>
          </div>

          {/* Amount of Bosses */}
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                amount of bosses
              </span>
              <span className="font-['Patrick_Hand'] text-base text-rose-400 font-bold">
                {bossCount} {bossCount === 1 ? 'boss' : 'bosses'}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => {
                    sound.playClick();
                    setBossCount(cnt);
                    setVerified(false);
                  }}
                  className={`py-1.5 rounded-xl font-['Patrick_Hand'] text-sm lowercase border cursor-pointer transition-all ${
                    bossCount === cnt
                      ? 'bg-rose-500 text-white font-bold border-rose-400'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {cnt === 0 ? 'none' : cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Chance of Any Power-Up */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                chance of power-ups
              </span>
              <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
                pods & portals
              </span>
            </div>

            {/* Speed Portals */}
            <div>
              <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-1">
                <span>speed portals / arrows</span>
                <span className="text-cyan-400 font-bold">{powerUpChances.speed}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={powerUpChances.speed}
                onChange={(e) => {
                  setPowerUpChances({ ...powerUpChances, speed: Number(e.target.value) });
                  setVerified(false);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Honey Traps */}
            <div>
              <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-1">
                <span>honey traps</span>
                <span className="text-amber-400 font-bold">{powerUpChances.honeyTraps}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={powerUpChances.honeyTraps}
                onChange={(e) => {
                  setPowerUpChances({ ...powerUpChances, honeyTraps: Number(e.target.value) });
                  setVerified(false);
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Nuke Bomb */}
            <div>
              <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-1">
                <span>nuke bomb</span>
                <span className="text-red-400 font-bold">{powerUpChances.nukeBomb}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={powerUpChances.nukeBomb}
                onChange={(e) => {
                  setPowerUpChances({ ...powerUpChances, nukeBomb: Number(e.target.value) });
                  setVerified(false);
                }}
                className="w-full accent-red-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Freeze Bomb */}
            <div>
              <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-1">
                <span>freeze bomb (emp)</span>
                <span className="text-sky-300 font-bold">{powerUpChances.freezeBomb}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={powerUpChances.freezeBomb}
                onChange={(e) => {
                  setPowerUpChances({ ...powerUpChances, freezeBomb: Number(e.target.value) });
                  setVerified(false);
                }}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>
          </div>

          {/* Level Duration */}
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-1">
              <span>chamber duration</span>
              <span className="text-neutral-200 font-bold">{durationSeconds}s</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={durationSeconds}
              onChange={(e) => {
                setDurationSeconds(Number(e.target.value));
                setVerified(false);
              }}
              className="w-full accent-neutral-300 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>

          {/* Verification & Publishing Section */}
          <div className="pt-3 border-t border-neutral-800/80 mt-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                verification status:
              </span>
              {verified ? (
                <span className="text-xs font-['Patrick_Hand'] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  verified 100% (ready to publish)
                </span>
              ) : (
                <span className="text-xs font-['Patrick_Hand'] text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  unverified (verify without noclip)
                </span>
              )}
            </div>

            {publishError && (
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-['Patrick_Hand'] text-xs lowercase text-center">
                {publishError}
              </div>
            )}

            {publishMessage && (
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-['Patrick_Hand'] text-xs lowercase text-center">
                {publishMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleVerify}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-neutral-950" />
                <span>{verified ? 're-verify' : 'verify chamber'}</span>
              </button>

              <button
                onClick={handlePublish}
                disabled={!verified || publishing}
                className={`w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] font-['Patrick_Hand'] text-base transition-all flex items-center justify-center gap-1.5 ${
                  verified && !publishing
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold cursor-pointer shadow-lg shadow-cyan-950/50'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{publishing ? 'publishing...' : 'publish'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
