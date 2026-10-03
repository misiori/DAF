import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Compass,
  PlusSquare,
  Sparkles,
  Flame,
  Infinity,
  Lock,
  Play,
  Monitor,
  X,
} from 'lucide-react';
import { LevelConfig, PlayerProfile } from '../types/game';
import {
  CustomLevel,
  customLevelToLevelConfig,
  isMobileDevice,
} from '../lib/customLevels';
import { YourLevels } from './YourLevels';
import { LevelEditor } from './LevelEditor';
import { DiscoverLevels } from './DiscoverLevels';
import { AmbientAntBackground } from './AmbientAntBackground';
import { LEVELS, FREE_MODE_LEVEL, DIFFICULTY_COLORS } from '../lib/constants';
import { sound } from '../lib/audio';

export type ChambersSubView =
  | 'menu'
  | 'official'
  | 'your_levels'
  | 'editor'
  | 'discover';

interface ChambersMenuProps {
  profile: PlayerProfile;
  onSelectLevel: (level: LevelConfig, section: ChambersSubView) => void;
  onBack: () => void;
  onOpenProfile?: (username: string) => void;
  initialSubView?: ChambersSubView;
  onSubViewChange?: (sub: ChambersSubView) => void;
}

export const ChambersMenu: React.FC<ChambersMenuProps> = ({
  profile,
  onSelectLevel,
  onBack,
  onOpenProfile,
  initialSubView = 'menu',
  onSubViewChange,
}) => {
  const [subView, setSubView] = useState<ChambersSubView>(initialSubView);
  const [editingLevel, setEditingLevel] = useState<CustomLevel | null>(null);
  const [mobileWarning, setMobileWarning] = useState<boolean>(false);

  // Sync subView if parent updates initialSubView
  React.useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  const switchSubView = (target: ChambersSubView) => {
    setSubView(target);
    onSubViewChange?.(target);
  };

  // Official campaign state
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [selectedOfficialLevel, setSelectedOfficialLevel] = useState<LevelConfig>(LEVELS[0]);
  const [showOfficialModal, setShowOfficialModal] = useState<boolean>(false);

  const isLevelBeaten = (lvlId: number) => {
    const numId = Number(lvlId);
    const strId = String(lvlId);
    const beatenList = (profile.beaten_levels || []).map(Number);
    if (beatenList.includes(numId)) return true;
    const p = profile.level_progress?.[numId] ?? profile.level_progress?.[strId] ?? 0;
    return Number(p) >= 100;
  };

  const getLevelProgress = (lvlId: number) => {
    if (isLevelBeaten(lvlId)) return 100;
    const numId = Number(lvlId);
    const strId = String(lvlId);
    const p = profile.level_progress?.[numId] ?? profile.level_progress?.[strId] ?? 0;
    return Math.min(100, Math.max(0, Math.round(Number(p) || 0)));
  };

  const getLevelHighScore = (lvlId: number) => {
    const numId = Number(lvlId);
    const strId = String(lvlId);
    const score = profile.high_scores?.[numId] ?? profile.high_scores?.[strId] ?? 0;
    return Number(score) || 0;
  };

  const beatenLevelsCount = LEVELS.filter((lvl) => isLevelBeaten(lvl.id)).length;
  const allLevelsBeaten = beatenLevelsCount >= LEVELS.length;

  const filteredLevels =
    filterDifficulty === 'all'
      ? LEVELS
      : filterDifficulty === 'free'
      ? [FREE_MODE_LEVEL]
      : LEVELS.filter((lvl) => lvl.difficulty.toLowerCase() === filterDifficulty);

  // Custom level actions
  const handlePlayCustomLevel = (lvl: CustomLevel, isVerification = false) => {
    const config = customLevelToLevelConfig(lvl, isVerification);
    const targetSection = subView === 'menu' ? 'discover' : subView;
    onSelectLevel(config, targetSection);
  };

  const handleOpenCreateOrEditor = (lvlToEdit: CustomLevel | null = null) => {
    if (isMobileDevice()) {
      sound.playHitSound();
      setMobileWarning(true);
      return;
    }
    setEditingLevel(lvlToEdit);
    switchSubView('editor');
  };

  // SUB-VIEW: Your Levels
  if (subView === 'your_levels') {
    return (
      <YourLevels
        profile={profile}
        onCreateNew={() => handleOpenCreateOrEditor(null)}
        onEditLevel={(lvl) => handleOpenCreateOrEditor(lvl)}
        onPlayLevel={(lvl, isVerification) => {
          const config = customLevelToLevelConfig(lvl, isVerification);
          onSelectLevel(config, 'your_levels');
        }}
        onBack={() => switchSubView('menu')}
      />
    );
  }

  // SUB-VIEW: Level Editor
  if (subView === 'editor') {
    return (
      <LevelEditor
        initialLevel={editingLevel}
        profile={profile}
        onSave={() => {}}
        onVerifyAndPlay={(lvl) => {
          const config = customLevelToLevelConfig(lvl, true);
          onSelectLevel(config, 'your_levels');
        }}
        onBack={() => switchSubView('your_levels')}
      />
    );
  }

  // SUB-VIEW: Discover (includes saved chambers tab in header)
  if (subView === 'discover') {
    return (
      <DiscoverLevels
        profile={profile}
        onPlayLevel={(lvl: CustomLevel, isVerification?: boolean) => {
          const config = customLevelToLevelConfig(lvl, isVerification);
          onSelectLevel(config, 'discover');
        }}
        onBack={() => switchSubView('menu')}
        onOpenCreatorProfile={onOpenProfile}
      />
    );
  }

  // SUB-VIEW: Official Campaign
  if (subView === 'official') {
    return (
      <div
        style={{
          paddingLeft: 'max(3.25rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(3.25rem, env(safe-area-inset-right, 0px))',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        }}
        className="relative w-full max-w-full min-h-[100dvh] h-auto overflow-y-auto bg-black text-neutral-100 flex flex-col select-none overscroll-none"
      >
        <AmbientAntBackground opacity={0.7} antCount={30} />
        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 border-b border-neutral-800/80 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              switchSubView('menu');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-700/70 hover:border-neutral-400 text-neutral-300 hover:text-white transition-all cursor-pointer font-['Patrick_Hand'] text-base lowercase"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-400" />
            <span>chambers</span>
          </button>

          <div className="font-['Caveat'] text-3xl sm:text-4xl text-neutral-200 lowercase">
            official
          </div>

          <div className="flex items-center gap-2 font-['Patrick_Hand'] text-sm text-neutral-400">
            <span>{beatenLevelsCount} / 23 beaten</span>
          </div>
        </div>

        {/* Filter Tabs by Difficulty */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto py-2.5 sm:py-3 shrink-0 no-scrollbar">
          {['all', 'easy', 'normal', 'hard', 'harder', 'insane', 'crazy', 'free'].map((diff) => {
            const isActive = filterDifficulty === diff;
            const isFree = diff === 'free';
            return (
              <button
                key={diff}
                onClick={() => {
                  sound.playClick();
                  setFilterDifficulty(diff);
                  if (diff === 'free') {
                    setSelectedOfficialLevel(FREE_MODE_LEVEL);
                  } else {
                    const targetList =
                      diff === 'all'
                        ? LEVELS
                        : LEVELS.filter((l) => l.difficulty.toLowerCase() === diff);
                    if (targetList.length > 0) setSelectedOfficialLevel(targetList[0]);
                  }
                }}
                className={`px-3.5 py-1 rounded-[220px_20px_200px_25px/20px_220px_25px_200px] font-['Patrick_Hand'] text-base lowercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-neutral-200 text-neutral-950 font-bold border border-white'
                    : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {isFree ? (
                  <>
                    <Infinity className="w-3.5 h-3.5" />
                    <span>free mode</span>
                    {allLevelsBeaten ? (
                      <span className="text-[11px] text-emerald-400 font-bold">✓</span>
                    ) : (
                      <Lock className="w-3 h-3 text-neutral-500" />
                    )}
                  </>
                ) : diff === 'crazy' ? (
                  <>
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>crazy</span>
                  </>
                ) : (
                  <span>{diff}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Level Library Grid */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredLevels.map((lvl) => {
              const progress = getLevelProgress(lvl.id);
              const isBeaten = isLevelBeaten(lvl.id);
              const highScore = getLevelHighScore(lvl.id);
              const isFree = lvl.isEndless;
              const diffColor = DIFFICULTY_COLORS[lvl.difficulty] || '#3b82f6';

              return (
                <motion.div
                  key={lvl.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedOfficialLevel(lvl);
                    setShowOfficialModal(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-3 sm:p-3.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] border transition-all cursor-pointer flex flex-col justify-between bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900/80 hover:border-neutral-500 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-['Patrick_Hand'] text-sm text-neutral-500">
                        {isFree ? '∞' : lvl.id < 10 ? `#0${lvl.id}` : `#${lvl.id}`}
                      </span>
                      <span
                        className="text-xs font-['Patrick_Hand'] lowercase px-2 py-0.5 rounded-full border"
                        style={{
                          color: diffColor,
                          borderColor: `${diffColor}40`,
                          backgroundColor: `${diffColor}10`,
                        }}
                      >
                        {lvl.difficulty.toLowerCase()}
                      </span>
                    </div>

                    <h3 className="font-['Caveat'] text-2xl text-neutral-100 truncate lowercase mb-1">
                      {lvl.name}
                    </h3>
                  </div>

                  {/* Progress (Green if 100%) & Best PTS */}
                  <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                    <span
                      className={`text-xs font-['Patrick_Hand'] lowercase ${
                        isBeaten || progress >= 100
                          ? 'text-emerald-400 font-bold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {isBeaten || progress >= 100 ? '100%' : `${progress}%`}
                    </span>
                    <span className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                      best: {highScore.toLocaleString()} pts
                    </span>
                    <Play className="w-4 h-4 fill-neutral-300 text-neutral-300 group-hover:scale-110 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Start Level Modal */}
        <AnimatePresence>
          {showOfficialModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowOfficialModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-700 p-6 text-center space-y-4"
              >
                <h2 className="font-['Caveat'] text-4xl text-white lowercase">
                  {selectedOfficialLevel.name}
                </h2>
                <p className="font-['Patrick_Hand'] text-base text-neutral-400 lowercase">
                  {selectedOfficialLevel.description}
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowOfficialModal(false);
                      onSelectLevel(selectedOfficialLevel, 'official');
                    }}
                    className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-lg font-bold shadow-md cursor-pointer hover:scale-105 transition-all"
                  >
                    start chamber
                  </button>
                  <button
                    onClick={() => setShowOfficialModal(false)}
                    className="w-full py-1.5 rounded-xl text-neutral-400 hover:text-white font-['Patrick_Hand'] text-sm lowercase cursor-pointer"
                  >
                    cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // MAIN BUTTON MENU
  return (
    <div
      style={{
        paddingLeft: 'max(3.25rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(3.25rem, env(safe-area-inset-right, 0px))',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
      }}
      className="relative w-full max-w-full min-h-[100dvh] h-auto overflow-y-auto bg-black text-neutral-100 flex flex-col select-none overscroll-none justify-between"
    >
      <AmbientAntBackground opacity={0.6} antCount={25} />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-700/80 hover:border-neutral-300 text-neutral-300 hover:text-white transition-all cursor-pointer font-['Patrick_Hand'] text-lg lowercase backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
          <span>menu</span>
        </button>

        <h1 className="font-['Caveat'] text-4xl sm:text-5xl text-neutral-100 lowercase">
          chambers
        </h1>

        <div className="w-20" />
      </div>

      {/* Center 3 Action Buttons Hub */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-2 py-4 space-y-3.5 sm:space-y-5 my-auto pb-8">
        {/* 1. OFFICIAL */}
        <motion.button
          onClick={() => {
            sound.playClick();
            switchSubView('official');
          }}
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.975 }}
          className="w-full p-5 sm:p-6 rounded-[255px_20px_225px_20px/20px_225px_20px_255px] bg-neutral-900/85 hover:bg-neutral-800/90 border-2 border-neutral-600 hover:border-white text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-800/80 border border-neutral-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-md">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="font-['Caveat'] text-4xl sm:text-5xl text-white font-bold lowercase leading-tight group-hover:text-neutral-100 transition-colors">
                official
              </h2>
            </div>
          </div>
        </motion.button>

        {/* 2. CREATE BUTTON */}
        <motion.button
          onClick={() => {
            sound.playClick();
            if (isMobileDevice()) {
              setMobileWarning(true);
              return;
            }
            switchSubView('your_levels');
          }}
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.975 }}
          className="w-full p-5 sm:p-6 rounded-[220px_25px_200px_22px/22px_210px_22px_220px] bg-neutral-900/85 hover:bg-neutral-800/90 border-2 border-neutral-600 hover:border-cyan-400 text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-md">
              <PlusSquare className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="font-['Caveat'] text-4xl sm:text-5xl text-white font-bold lowercase leading-tight group-hover:text-cyan-300 transition-colors">
                create
              </h2>
            </div>
          </div>
        </motion.button>

        {/* 3. DISCOVER BUTTON */}
        <motion.button
          onClick={() => {
            sound.playClick();
            switchSubView('discover');
          }}
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.975 }}
          className="w-full p-5 sm:p-6 rounded-[240px_18px_230px_22px/18px_235px_22px_240px] bg-neutral-900/85 hover:bg-neutral-800/90 border-2 border-neutral-600 hover:border-amber-400 text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-md">
              <Compass className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="font-['Caveat'] text-4xl sm:text-5xl text-white font-bold lowercase leading-tight group-hover:text-amber-300 transition-colors">
                discover
              </h2>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Mobile Notice Modal */}
      <AnimatePresence>
        {mobileWarning && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-700 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-600 mx-auto flex items-center justify-center text-neutral-300">
                <Monitor className="w-6 h-6" />
              </div>
              <p className="font-['Patrick_Hand'] text-2xl text-neutral-200 lowercase leading-snug">
                sorry! u can build just on computers.
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  setMobileWarning(false);
                }}
                className="w-full py-2 rounded-2xl bg-neutral-100 text-neutral-950 font-['Patrick_Hand'] text-lg font-bold cursor-pointer hover:bg-white"
              >
                got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};