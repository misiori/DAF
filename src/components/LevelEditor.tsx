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
  Check,
  Image as ImageIcon,
  Bomb,
  Snowflake,
  X,
  Gauge,
} from 'lucide-react';
import {
  CustomLevel,
  CustomLevelDifficulty,
  CustomAnthillPlacement,
  CustomCocoonPlacement,
  PowerUpChances,
  THEME_COLOR_PRESETS,
  ALL_FORMATIONS,
  saveDraftLevel,
  saveLastEditingLevel,
  publishCustomLevel,
  isMobileDevice,
} from '../lib/customLevels';
import { PlayerProfile, AntFormation, CustomPowerUpPlacement, CustomSpeedPortalPlacement, SpeedMultiplier } from '../types/game';
import { DIFFICULTY_COLORS } from '../lib/constants';
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
  const [bgImage, setBgImage] = useState<string | undefined>(
    initialLevel?.bgImage || (initialLevel?.powerUpChances as any)?.bgImage
  );
  const [bgOpacity, setBgOpacity] = useState<number>(
    initialLevel?.bgOpacity ?? (initialLevel?.powerUpChances as any)?.bgOpacity ?? 40
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [anthills, setAnthills] = useState<CustomAnthillPlacement[]>(
    initialLevel?.anthills || [
      { id: 1, xFrac: 0.3, yFrac: 0.4, type: 'standard', hp: 3 },
      { id: 2, xFrac: 0.7, yFrac: 0.6, type: 'standard', hp: 3 },
    ]
  );
  const [cocoons, setCocoons] = useState<CustomCocoonPlacement[]>(
    initialLevel?.cocoons || [{ id: 1, xFrac: 0.5, yFrac: 0.3, hp: 6 }]
  );
  const [customPowerUps, setCustomPowerUps] = useState<CustomPowerUpPlacement[]>(
    initialLevel?.customPowerUps || (initialLevel?.powerUpChances as any)?.customPowerUps || []
  );
  const [customSpeedPortals, setCustomSpeedPortals] = useState<CustomSpeedPortalPlacement[]>(
    initialLevel?.customSpeedPortals || (initialLevel?.powerUpChances as any)?.customSpeedPortals || []
  );

  const [bossCount, setBossCount] = useState<number>(initialLevel?.bossCount ?? 1);
  const [powerUpChances, setPowerUpChances] = useState<PowerUpChances>(
    initialLevel?.powerUpChances || {
      speed: 60,
      honeyTraps: 50,
      nukeBomb: 40,
      freezeBomb: 40,
      speed05: 50,
      speed10: 50,
      speed15: 50,
      speed20: 50,
    }
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(
    initialLevel?.durationSeconds ?? 40
  );
  const [difficulty, setDifficulty] = useState<CustomLevelDifficulty>(() => {
    if (initialLevel?.difficulty && initialLevel.difficulty !== 'Unrated') {
      return initialLevel.difficulty;
    }
    const fromPuc = (initialLevel?.powerUpChances as any)?.difficulty;
    if (fromPuc && fromPuc !== 'Unrated') {
      return fromPuc;
    }
    return 'Normal';
  });
  const [verified, setVerified] = useState<boolean>(initialLevel?.verified ?? false);
  const [published, setPublished] = useState<boolean>(initialLevel?.published ?? false);
  const [formations, setFormations] = useState<AntFormation[]>(() => {
    if (initialLevel?.formations && initialLevel.formations.length > 0) {
      return initialLevel.formations;
    }
    const fromPowerUps = (initialLevel?.powerUpChances as any)?.formations;
    if (Array.isArray(fromPowerUps) && fromPowerUps.length > 0) {
      return fromPowerUps;
    }
    return ['direct']; // default is one direction
  });

  // Sync state if initialLevel prop updates (e.g. after verification or editing level selection)
  useEffect(() => {
    if (initialLevel) {
      if (initialLevel.name) setName(initialLevel.name);
      if (initialLevel.themeColor) setThemeColor(initialLevel.themeColor);
      const bg = initialLevel.bgImage || (initialLevel.powerUpChances as any)?.bgImage;
      if (bg !== undefined) setBgImage(bg);
      const op = initialLevel.bgOpacity ?? (initialLevel.powerUpChances as any)?.bgOpacity;
      if (op !== undefined) setBgOpacity(op);
      if (initialLevel.anthills && initialLevel.anthills.length > 0) setAnthills(initialLevel.anthills);
      if (initialLevel.cocoons) setCocoons(initialLevel.cocoons);
      const ups = initialLevel.customPowerUps || (initialLevel.powerUpChances as any)?.customPowerUps;
      if (ups) setCustomPowerUps(ups);
      const ports = initialLevel.customSpeedPortals || (initialLevel.powerUpChances as any)?.customSpeedPortals;
      if (ports) setCustomSpeedPortals(ports);
      if (initialLevel.bossCount !== undefined) setBossCount(initialLevel.bossCount);
      if (initialLevel.durationSeconds !== undefined) setDurationSeconds(initialLevel.durationSeconds);
      if (initialLevel.powerUpChances) setPowerUpChances(initialLevel.powerUpChances);
      const diff =
        (initialLevel.difficulty && initialLevel.difficulty !== 'Unrated')
          ? initialLevel.difficulty
          : (initialLevel.powerUpChances as any)?.difficulty;
      if (diff && diff !== 'Unrated') setDifficulty(diff);
      if (initialLevel.verified !== undefined) setVerified(initialLevel.verified);
      if (initialLevel.published !== undefined) setPublished(initialLevel.published);
    }
  }, [initialLevel?.id, initialLevel?.updatedAt]);

  const handleToggleFormation = (f: AntFormation) => {
    sound.playClick();
    if (formations.includes(f)) {
      if (formations.length <= 1) {
        setPublishError('u need to choose at least one direction!');
        setTimeout(() => setPublishError(null), 2500);
        return;
      }
      setFormations(formations.filter((item) => item !== f));
    } else {
      setFormations([...formations, f]);
    }
    setVerified(false); // modifying movement directions changes gameplay difficulty -> re-verify
  };

  // Editor placement tool: anthill, cocoon, powerup, portal, erase
  const [activeTool, setActiveTool] = useState<'anthill' | 'cocoon' | 'powerup' | 'portal' | 'erase'>('anthill');
  const [powerUpType, setPowerUpType] = useState<'nuke_bomb' | 'emp_bomb' | 'honey_trap'>('nuke_bomb');
  const [portalSpeed, setPortalSpeed] = useState<SpeedMultiplier>(1.5);

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
    bgImage,
    bgOpacity,
    anthills,
    cocoons,
    customPowerUps,
    customSpeedPortals,
    bossCount,
    powerUpChances: {
      ...powerUpChances,
      customPowerUps,
      customSpeedPortals,
      bgImage,
      bgOpacity,
      formations: formations.length > 0 ? formations : ['direct'],
      difficulty,
    },
    durationSeconds,
    difficulty,
    verified,
    published,
    plays: initialLevel?.plays || 0,
    formations: formations.length > 0 ? formations : ['direct'],
    createdAt: initialLevel?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Always keep last editing level cached in localStorage so test play & exit never loses work
  useEffect(() => {
    const lvl = getCurrentLevel();
    saveLastEditingLevel(lvl);
  }, [
    name,
    themeColor,
    bgImage,
    bgOpacity,
    anthills,
    cocoons,
    customPowerUps,
    customSpeedPortals,
    bossCount,
    powerUpChances,
    durationSeconds,
    difficulty,
    formations,
    verified,
    published,
  ]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setPublishError('image too large (max 8MB)');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Downscale image to a lightweight canvas (max 1280x720) to prevent localStorage quota issues
        const maxW = 1280;
        const maxH = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setBgImage(compressed);
          setVerified(false);
          sound.playClick();
        } else {
          setBgImage(rawDataUrl);
          setVerified(false);
          sound.playClick();
        }
      };
      img.onerror = () => {
        setBgImage(rawDataUrl);
        setVerified(false);
        sound.playClick();
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handle click on the interactive placement arena (no limit on anthills, cocoons, powerups, or portals)
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
        setVerified(false);
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
      const hitPowerUpIdx = customPowerUps.findIndex(
        (p) => Math.hypot(p.xFrac - xFrac, p.yFrac - yFrac) < 0.08
      );
      if (hitPowerUpIdx >= 0) {
        sound.playZap();
        const updated = [...customPowerUps];
        updated.splice(hitPowerUpIdx, 1);
        setCustomPowerUps(updated);
        setVerified(false);
        return;
      }
      const hitPortalIdx = customSpeedPortals.findIndex(
        (p) => Math.hypot(p.xFrac - xFrac, p.yFrac - yFrac) < 0.08
      );
      if (hitPortalIdx >= 0) {
        sound.playZap();
        const updated = [...customSpeedPortals];
        updated.splice(hitPortalIdx, 1);
        setCustomSpeedPortals(updated);
        setVerified(false);
        return;
      }
      return;
    }

    if (activeTool === 'anthill') {
      sound.playClick();
      const newHill: CustomAnthillPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        hp: 3,
      };
      setAnthills([...anthills, newHill]);
      setVerified(false);
    } else if (activeTool === 'cocoon') {
      sound.playClick();
      const newCocoon: CustomCocoonPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        hp: 6,
      };
      setCocoons([...cocoons, newCocoon]);
      setVerified(false);
    } else if (activeTool === 'powerup') {
      sound.playClick();
      const newPowerUp: CustomPowerUpPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        type: powerUpType,
      };
      setCustomPowerUps([...customPowerUps, newPowerUp]);
      setVerified(false);
    } else if (activeTool === 'portal') {
      sound.playClick();
      const newPortal: CustomSpeedPortalPlacement = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        xFrac,
        yFrac,
        targetSpeed: portalSpeed,
      };
      setCustomSpeedPortals([...customSpeedPortals, newPortal]);
      setVerified(false);
    }
  };

  const handleBackWithAutoSave = async () => {
    sound.playClick();
    const lvl = getCurrentLevel();
    await saveDraftLevel(lvl, profile);
    onSave(lvl);
    onBack();
  };

  const handleSaveDraft = async () => {
    sound.playClick();
    if (formations.length === 0) {
      setPublishError('choose at least one direction in the editor!');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }
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
    if (formations.length === 0) {
      setPublishError('choose at least one direction in the editor!');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }
    const lvl = getCurrentLevel();
    await saveDraftLevel(lvl, profile);
    onVerifyAndPlay(lvl);
  };

  const handlePublish = async () => {
    sound.playClick();
    if (formations.length === 0) {
      setPublishError('choose at least one direction in the editor!');
      setTimeout(() => setPublishError(null), 3000);
      return;
    }
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
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-black text-neutral-100 flex flex-col p-3 sm:p-5 select-none editor-scroll">
      {/* Top Header (Sticky) */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md flex items-center justify-between pb-2.5 pt-0.5 border-b border-neutral-800 shrink-0">
        <button
          onClick={handleBackWithAutoSave}
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
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-3 pb-10">
        {/* Left Column: Interactive Arena Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-neutral-950/70 border border-neutral-800 rounded-3xl p-3 sm:p-4 lg:sticky lg:top-14 h-[440px] sm:h-[500px] lg:h-[calc(100vh-5.25rem)] min-h-[380px]">
          {/* Tool Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 mb-2 border-b border-neutral-800/80 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Anthill Tool */}
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('anthill');
                }}
                className={`px-2.5 py-1 rounded-xl font-['Patrick_Hand'] text-xs sm:text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
                  activeTool === 'anthill'
                    ? 'bg-neutral-100 text-neutral-950 font-bold border-white'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <span>+ anthill ({anthills.length})</span>
              </button>

              {/* Cocoon Tool */}
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('cocoon');
                }}
                className={`px-2.5 py-1 rounded-xl font-['Patrick_Hand'] text-xs sm:text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
                  activeTool === 'cocoon'
                    ? 'bg-rose-500 text-white font-bold border-rose-400'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <span>+ cocoon ({cocoons.length})</span>
              </button>

              {/* Power-Up Manual Placement Tool */}
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('powerup');
                }}
                className={`px-2.5 py-1 rounded-xl font-['Patrick_Hand'] text-xs sm:text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
                  activeTool === 'powerup'
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ power-up ({customPowerUps.length})</span>
              </button>

              {activeTool === 'powerup' && (
                <div className="flex items-center gap-1">
                  {(['nuke_bomb', 'emp_bomb', 'honey_trap'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        sound.playClick();
                        setPowerUpType(t);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-['Patrick_Hand'] lowercase border ${
                        powerUpType === t
                          ? t === 'nuke_bomb'
                            ? 'bg-red-500/20 text-red-300 border-red-500'
                            : t === 'emp_bomb'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-neutral-900/60 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      {t === 'nuke_bomb' ? 'nuke' : t === 'emp_bomb' ? 'freeze' : 'honey trap'}
                    </button>
                  ))}
                </div>
              )}

              {/* Speed Portal Manual Placement Tool */}
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('portal');
                }}
                className={`px-2.5 py-1 rounded-xl font-['Patrick_Hand'] text-xs sm:text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
                  activeTool === 'portal'
                    ? 'bg-cyan-400 text-neutral-950 font-bold border-cyan-300'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>+ speed portal ({customSpeedPortals.length})</span>
              </button>

              {activeTool === 'portal' && (
                <div className="flex items-center gap-1">
                  {([0.5, 1.0, 1.5, 2.0] as SpeedMultiplier[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        sound.playClick();
                        setPortalSpeed(s);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-['Patrick_Hand'] lowercase border ${
                        portalSpeed === s
                          ? s === 0.5
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                            : s === 1.0
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500 font-bold'
                            : s === 1.5
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500 font-bold'
                          : 'bg-neutral-900/60 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}

              {/* Erase Tool */}
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTool('erase');
                }}
                className={`px-2 py-1 rounded-xl font-['Patrick_Hand'] text-xs sm:text-sm lowercase flex items-center gap-1 cursor-pointer border transition-all ${
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
                setCustomPowerUps([]);
                setCustomSpeedPortals([]);
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
            {/* Custom Uploaded Background Image */}
            {bgImage && (
              <img
                src={bgImage}
                alt="arena bg"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: bgOpacity / 100 }}
              />
            )}

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
                  hill #{i + 1}
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

            {/* Placed Custom Power-Ups */}
            {customPowerUps.map((p, i) => (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none group"
                style={{
                  left: `${p.xFrac * 100}%`,
                  top: `${p.yFrac * 100}%`,
                }}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-md ${
                    p.type === 'nuke_bomb'
                      ? 'bg-red-500/20 border-red-400 text-red-300 shadow-red-950/40'
                      : p.type === 'emp_bomb'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sky-950/40'
                      : 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-950/40'
                  }`}
                >
                  {p.type === 'nuke_bomb' ? (
                    <Bomb className="w-4 h-4" />
                  ) : p.type === 'emp_bomb' ? (
                    <Snowflake className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[9px] font-['Patrick_Hand'] text-neutral-300 bg-black/80 px-1 rounded mt-0.5 lowercase whitespace-nowrap">
                  {p.type === 'nuke_bomb' ? 'nuke' : p.type === 'emp_bomb' ? 'freeze' : 'honey'}
                </span>
              </div>
            ))}

            {/* Placed Custom Speed Portals */}
            {customSpeedPortals.map((sp) => (
              <div
                key={sp.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{
                  left: `${sp.xFrac * 100}%`,
                  top: `${sp.yFrac * 100}%`,
                }}
              >
                <div
                  className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center font-['Patrick_Hand'] text-xs font-bold shadow-lg ${
                    sp.targetSpeed === 0.5
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                      : sp.targetSpeed === 1.0
                      ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                      : sp.targetSpeed === 1.5
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-rose-500/25 border-rose-400 text-rose-300'
                  }`}
                >
                  {sp.targetSpeed}x
                </div>
                <span className="text-[9px] font-['Patrick_Hand'] text-neutral-300 bg-black/80 px-1 rounded mt-0.5 lowercase">
                  portal
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs font-['Patrick_Hand'] text-neutral-500 flex items-center justify-end lowercase shrink-0">
            <span>
              {anthills.length} hills • {cocoons.length} cocoons • {customPowerUps.length} power-ups • {customSpeedPortals.length} portals
            </span>
          </div>
        </div>

        {/* Right Column: Settings, Theme Color, Power-Up Chances, Boss Count (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-neutral-950/70 border border-neutral-800 rounded-3xl p-3 sm:p-4 space-y-4">
          {/* Custom Uploaded Background Image Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                background
              </span>
              {bgImage && (
                <button
                  onClick={() => {
                    sound.playClick();
                    setBgImage(undefined);
                    setVerified(false);
                  }}
                  className="text-xs font-['Patrick_Hand'] text-rose-400 hover:text-rose-300 lowercase cursor-pointer"
                >
                  remove image
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => {
                  sound.playClick();
                  fileInputRef.current?.click();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-['Patrick_Hand'] text-xs lowercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-400" />
                <span>{bgImage ? 'change background image' : 'upload background image'}</span>
              </button>
              {bgImage && (
                <div className="w-9 h-9 rounded-lg border border-neutral-700 overflow-hidden shrink-0 bg-neutral-900">
                  <img src={bgImage} alt="bg" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            {bgImage && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                  <span>opacity</span>
                  <span className="text-neutral-200 font-bold">{bgOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={bgOpacity}
                  onChange={(e) => {
                    setBgOpacity(Number(e.target.value));
                    setVerified(false);
                  }}
                  className="w-full accent-neutral-300 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Theme Color Picker */}
          <div className="pt-2 border-t border-neutral-800/80">
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
                pick a custom color
              </span>
            </div>
          </div>

          {/* Chamber Difficulty & Speed Selector */}
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                chamber difficulty
              </span>
              <span
                className="text-xs font-['Patrick_Hand'] font-bold px-2 py-0.5 rounded-full border lowercase"
                style={{
                  color: DIFFICULTY_COLORS[difficulty] || '#38bdf8',
                  borderColor: `${DIFFICULTY_COLORS[difficulty] || '#38bdf8'}60`,
                  backgroundColor: `${DIFFICULTY_COLORS[difficulty] || '#38bdf8'}15`,
                }}
              >
                {difficulty.toLowerCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Crazy'] as CustomLevelDifficulty[]).map((d) => {
                const color = DIFFICULTY_COLORS[d] || '#38bdf8';
                const isSelected = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setDifficulty(d);
                      setVerified(false); // changing speed/difficulty requires re-verification
                    }}
                    className={`py-2 px-1 rounded-xl border text-xs font-['Patrick_Hand'] lowercase flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-bold scale-[1.02] shadow-sm'
                        : 'bg-neutral-900/60 text-neutral-400 hover:text-white border-neutral-800/80 hover:border-neutral-700'
                    }`}
                    style={isSelected ? { borderColor: color, color } : undefined}
                  >
                    <span className="font-bold">{d.toLowerCase()}</span>
                  </button>
                );
              })}
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

          {/* Chance of Any Power-Up & Individual Speed Portal Chances */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                chance of power-ups & speed portals
              </span>
              <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
                spawn chances
              </span>
            </div>

            {/* Individual Speed Portal Rates */}
            <div className="space-y-1.5 bg-neutral-900/60 p-2.5 rounded-2xl border border-neutral-800/90">
              <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-300 lowercase mb-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  speed portals rate (for EVERY speed)
                </span>
                <span className="text-cyan-400 font-bold">{powerUpChances.speed}% overall</span>
              </div>

              {/* Total Speed Portal Frequency */}
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
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg mb-2"
              />

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/70">
                {/* 0.5x Slow */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-['Patrick_Hand'] lowercase">
                    <span className="text-emerald-400 font-bold">0.5x slow</span>
                    <span className="text-neutral-400">{powerUpChances.speed05 ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={powerUpChances.speed05 ?? 50}
                    onChange={(e) => {
                      setPowerUpChances({ ...powerUpChances, speed05: Number(e.target.value) });
                      setVerified(false);
                    }}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>

                {/* 1.0x Normal */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-['Patrick_Hand'] lowercase">
                    <span className="text-sky-400 font-bold">1.0x normal</span>
                    <span className="text-neutral-400">{powerUpChances.speed10 ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={powerUpChances.speed10 ?? 50}
                    onChange={(e) => {
                      setPowerUpChances({ ...powerUpChances, speed10: Number(e.target.value) });
                      setVerified(false);
                    }}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>

                {/* 1.5x Fast */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-['Patrick_Hand'] lowercase">
                    <span className="text-amber-400 font-bold">1.5x fast</span>
                    <span className="text-neutral-400">{powerUpChances.speed15 ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={powerUpChances.speed15 ?? 50}
                    onChange={(e) => {
                      setPowerUpChances({ ...powerUpChances, speed15: Number(e.target.value) });
                      setVerified(false);
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>

                {/* 2.0x Hyper */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-['Patrick_Hand'] lowercase">
                    <span className="text-rose-400 font-bold">2.0x hyper</span>
                    <span className="text-neutral-400">{powerUpChances.speed20 ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={powerUpChances.speed20 ?? 50}
                    onChange={(e) => {
                      setPowerUpChances({ ...powerUpChances, speed20: Number(e.target.value) });
                      setVerified(false);
                    }}
                    className="w-full accent-rose-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>
              </div>
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
                <span>freeze</span>
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

          {/* Ant Directions / Movement Formations */}
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                ant directions
              </span>
              <span className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                {formations.length} / 5 chosen
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {ALL_FORMATIONS.map((f) => {
                const isSelected = formations.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleToggleFormation(f.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-emerald-500/70 text-neutral-100 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-black'
                            : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-['Patrick_Hand'] text-sm lowercase leading-tight text-neutral-200">
                        {f.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-['Patrick_Hand'] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                          f.id === 'direct'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : f.id === 'spiral'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : f.id === 'orbit'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : f.id === 'twin'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                        }`}
                      >
                        {f.diffTag}
                      </span>
                    </div>
                  </button>
                );
              })}
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
                  verified
                </span>
              ) : (
                <span className="text-xs font-['Patrick_Hand'] text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  unverified
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
