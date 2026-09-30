import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Music,
  Flame,
  Infinity,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  LEVELS,
  FREE_MODE_LEVEL,
  DIFFICULTY_COLORS,
} from '../lib/constants';
import { LevelConfig, PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';
import { AmbientAntBackground } from './AmbientAntBackground';

interface LevelSelectProps {
  profile: PlayerProfile;
  onSelectLevel: (level: LevelConfig) => void;
  onBack: () => void;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  profile,
  onSelectLevel,
  onBack,
}) => {
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVELS[0]);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Reliable level beaten and progress check supporting both number and string keys
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

  const selectedProgress = getLevelProgress(selectedLevel.id);
  const isSelectedBeaten = isLevelBeaten(selectedLevel.id);
  const selectedHighScore = getLevelHighScore(selectedLevel.id);

  const handleLevelClick = (lvl: LevelConfig) => {
    sound.playClick();
    setSelectedLevel(lvl);
    setShowModal(true);
  };

  const handleStartLevel = () => {
    sound.playClick();
    setShowModal(false);
    onSelectLevel(selectedLevel);
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col p-3 sm:p-5 select-none overscroll-none">
      <AmbientAntBackground opacity={0.7} antCount={30} />
      {/* Top Bar: minimal header */}
      <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 border-b border-neutral-800/80 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-700/70 hover:border-neutral-400 text-neutral-300 hover:text-white transition-all cursor-pointer font-['Patrick_Hand'] text-base lowercase"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
          <span>back</span>
        </button>

        {/* Minimal Progress Indicator */}
        <div className="flex items-center gap-2 font-['Patrick_Hand'] text-sm text-neutral-400">
          <span>{beatenLevelsCount} / 23 beaten</span>
          <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-300 transition-all"
              style={{ width: `${(beatenLevelsCount / 23) * 100}%` }}
            />
          </div>
        </div>

        <div className="font-['Caveat'] text-3xl sm:text-4xl text-neutral-200 lowercase">
          chambers
        </div>
      </div>

      {/* Filter Tabs by Difficulty - lowercase */}
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
                  setSelectedLevel(FREE_MODE_LEVEL);
                } else {
                  const targetList =
                    diff === 'all'
                      ? LEVELS
                      : LEVELS.filter((l) => l.difficulty.toLowerCase() === diff);
                  if (targetList.length > 0) setSelectedLevel(targetList[0]);
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
                onClick={() => handleLevelClick(lvl)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                role="button"
                tabIndex={0}
                style={{ touchAction: 'manipulation' }}
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
                        background: `${diffColor}10`,
                      }}
                    >
                      {lvl.difficulty.toLowerCase()}
                    </span>
                  </div>

                  <h3 className="font-['Caveat'] text-2xl font-bold text-neutral-100 group-hover:text-white truncate lowercase">
                    {lvl.name.toLowerCase()}
                  </h3>

                  <div className="flex items-center gap-2 text-xs font-['Patrick_Hand'] text-neutral-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3 text-neutral-500" />
                      {lvl.songTitle.toLowerCase()}
                    </span>
                    <span>•</span>
                    <span>{lvl.bpm} bpm</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60">
                  {/* Status of beating chamber / percent & best pts */}
                  <div className="flex items-center gap-2">
                    {isBeaten ? (
                      <div className="flex items-center gap-1 text-xs font-['Patrick_Hand'] text-emerald-400 font-bold lowercase">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400 text-neutral-950 inline-block" />
                        <span>100% beaten</span>
                      </div>
                    ) : (
                      <div className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                        <span>{progress}%</span>
                      </div>
                    )}
                    {highScore > 0 && (
                      <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
                        • {highScore.toLocaleString()} pts
                      </span>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-800 group-hover:bg-white group-hover:text-black text-neutral-400 border border-neutral-700 flex items-center justify-center transition-colors">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level Preview Modal: Minimalist - NO song link, NO description, NO stats */}
      <AnimatePresence>
        {showModal && selectedLevel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] p-6 text-center shadow-2xl flex flex-col items-center"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowModal(false);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase mb-1">
                {selectedLevel.isEndless ? 'free mode' : `chamber #${selectedLevel.id}`}
              </div>

              <h3 className="font-['Caveat'] text-4xl font-bold text-neutral-100 lowercase mb-2">
                {selectedLevel.name.toLowerCase()}
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-['Patrick_Hand'] lowercase border"
                  style={{
                    color: DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6',
                    borderColor: `${DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6'}40`,
                    background: `${DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6'}10`,
                  }}
                >
                  {selectedLevel.difficulty.toLowerCase()}
                </span>
                <span className="text-xs font-['Patrick_Hand'] text-neutral-400">
                  {selectedLevel.bpm} bpm
                </span>
              </div>

              {/* Progress & high score status */}
              <div className="mb-6 space-y-1">
                {isSelectedBeaten ? (
                  <div className="inline-flex items-center gap-1.5 text-sm font-['Patrick_Hand'] text-emerald-400 font-bold lowercase px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-neutral-950" />
                    <span>100% beaten</span>
                  </div>
                ) : (
                  <div className="text-sm font-['Patrick_Hand'] text-neutral-400 lowercase">
                    progress: {selectedProgress}%
                  </div>
                )}
                {selectedHighScore > 0 && (
                  <div className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                    best: {selectedHighScore.toLocaleString()} pts
                  </div>
                )}
              </div>

              {/* Play Button */}
              {selectedLevel.isEndless && !allLevelsBeaten ? (
                <div className="text-xs font-['Patrick_Hand'] text-neutral-500">
                  beat all 23 chambers to unlock free mode
                </div>
              ) : (
                <button
                  onClick={handleStartLevel}
                  className="w-16 h-16 rounded-[255px_18px_225px_20px/18px_225px_18px_255px] border-2 border-neutral-300 hover:border-white bg-neutral-800/80 hover:bg-neutral-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-110 group"
                  title="play"
                >
                  <Play className="w-8 h-8 fill-white text-white ml-1 transition-transform group-hover:scale-110" />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
