import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Music,
  ExternalLink,
  Flame,
  Infinity,
  Lock,
  CheckCircle2,
  Crown,
  X,
} from 'lucide-react';
import {
  LEVELS,
  FREE_MODE_LEVEL,
  DIFFICULTY_COLORS,
  DIFFICULTY_ANT_SCALING,
} from '../lib/constants';
import { LevelConfig, PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';

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
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVELS[0]);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Check how many levels beaten (STRICTLY 100% completed till the end)
  const beatenSet = new Set(profile.beaten_levels || []);
  const beatenLevelsCount = LEVELS.filter((lvl) => beatenSet.has(lvl.id)).length;
  const allLevelsBeaten = beatenLevelsCount >= LEVELS.length;

  const filteredLevels =
    filterDifficulty === 'All'
      ? LEVELS
      : filterDifficulty === 'FreeMode'
      ? [FREE_MODE_LEVEL]
      : LEVELS.filter((lvl) => lvl.difficulty === filterDifficulty);

  const personalBest = profile.high_scores[selectedLevel.id] || 0;
  const isSelectedBeaten = beatenSet.has(selectedLevel.id);

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
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-neutral-950 text-white flex flex-col p-3 sm:p-5 select-none overscroll-none">
      {/* Background ambient lighting */}
      <div
        className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-700 bg-blue-600"
      />
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f610_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between pb-2.5 sm:pb-3 border-b border-blue-900/40 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-blue-800/50 text-neutral-300 hover:text-white transition-all cursor-pointer font-mono text-xs font-bold shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>BACK TO MENU</span>
        </button>

        {/* Free Mode Unlock Progress Banner */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              ENDLESS MODE UNLOCK
            </div>
            <div className="text-xs font-mono font-bold text-blue-400">
              {allLevelsBeaten
                ? '🎉 ALL 23 BEATEN — FREE MODE UNLOCKED'
                : `${beatenLevelsCount} / 23 Beaten (100%)`}
            </div>
          </div>
          <div className="w-24 bg-neutral-900 h-2 rounded-full border border-blue-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
              style={{ width: `${(beatenLevelsCount / 23) * 100}%` }}
            />
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] sm:text-xs font-mono text-blue-400 uppercase tracking-widest">
            A GAME BY MISIORI
          </div>
          <div className="text-base sm:text-xl font-black font-['Russo_One'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 leading-none">
            CHAMBER SELECT
          </div>
        </div>
      </div>

      {/* Filter Tabs by Difficulty */}
      <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto py-2.5 sm:py-3 shrink-0 no-scrollbar">
        {['All', 'Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Crazy', 'FreeMode'].map((diff) => {
          const isActive = filterDifficulty === diff;
          const isFree = diff === 'FreeMode';
          return (
            <button
              key={diff}
              onClick={() => {
                sound.playClick();
                setFilterDifficulty(diff);
                if (diff === 'FreeMode') {
                  setSelectedLevel(FREE_MODE_LEVEL);
                } else {
                  const targetList =
                    diff === 'All' ? LEVELS : LEVELS.filter((l) => l.difficulty === diff);
                  if (targetList.length > 0) setSelectedLevel(targetList[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400'
                  : 'bg-neutral-900/80 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {isFree ? (
                <>
                  <Infinity className="w-3.5 h-3.5 text-cyan-300" />
                  Free Mode
                  {allLevelsBeaten ? (
                    <span className="text-[10px] text-green-400 font-bold">✓</span>
                  ) : (
                    <Lock className="w-3 h-3 text-neutral-500" />
                  )}
                </>
              ) : diff === 'Crazy' ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Crazy (3)
                </>
              ) : (
                `${diff} ${diff === 'All' ? '(23)' : '(4)'}`
              )}
            </button>
          );
        })}
      </div>

      {/* Main Screen Level Library Grid Container (Scrollable internally) */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredLevels.map((lvl) => {
            const lvlScore = profile.high_scores[lvl.id] || 0;
            const isBeaten = beatenSet.has(lvl.id);
            const isFree = lvl.isEndless;
            const diffColor = DIFFICULTY_COLORS[lvl.difficulty] || '#3b82f6';

            return (
              <motion.div
                key={lvl.id}
                onClick={() => handleLevelClick(lvl)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900/70 hover:border-blue-500/60 shadow-md"
              >
                {/* Left accent strip */}
                <div
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all"
                  style={{ background: diffColor }}
                />

                <div className="pl-2">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-black text-neutral-500 group-hover:text-blue-400">
                      {isFree ? '∞' : lvl.id < 10 ? `0${lvl.id}` : lvl.id}
                    </span>
                    <span
                      className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
                      style={{
                        color: diffColor,
                        borderColor: `${diffColor}60`,
                        background: `${diffColor}18`,
                      }}
                    >
                      {lvl.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black font-['Russo_One'] tracking-wide text-white truncate group-hover:text-blue-300 transition-colors">
                    {lvl.name}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono mt-1">
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3 text-neutral-500" />
                      {lvl.bpm} BPM
                    </span>
                    <span>•</span>
                    <span>{isFree ? 'Dynamic 15s' : `${lvl.durationSeconds}s`}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 pl-2 border-t border-neutral-900">
                  {isBeaten ? (
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-sky-500 text-neutral-950" />
                      <span>100% BEATEN</span>
                    </div>
                  ) : lvlScore > 0 ? (
                    <div className="text-[10px] font-mono text-neutral-400">
                      Best: <span className="text-blue-400 font-bold">{lvlScore.toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-neutral-600">UNBEATEN</span>
                  )}

                  <div className="p-1.5 rounded-lg bg-neutral-900 group-hover:bg-blue-600 text-neutral-400 group-hover:text-white border border-neutral-800 group-hover:border-blue-400 transition-all">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level Selection Preview Modal (Opens upon selecting any level) */}
      <AnimatePresence>
        {showModal && selectedLevel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-blue-900/60 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-blue-950/40 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Ambient colored glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25"
                style={{
                  background: DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6',
                }}
              />

              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowModal(false);
                }}
                className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="pr-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase border"
                    style={{
                      color: DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6',
                      borderColor: `${DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6'}60`,
                      background: `${DIFFICULTY_COLORS[selectedLevel.difficulty] || '#3b82f6'}20`,
                    }}
                  >
                    {selectedLevel.difficulty}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {selectedLevel.isEndless ? 'FREE RANDOMIZER' : `CHAMBER #${selectedLevel.id}`}
                  </span>
                  {isSelectedBeaten && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-600/50">
                      <CheckCircle2 className="w-3 h-3 fill-sky-400 text-neutral-950" />
                      100% BEATEN
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-black font-['Russo_One'] tracking-wide text-white">
                  {selectedLevel.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-300 mt-2.5 leading-relaxed">
                {selectedLevel.description}
              </p>

              {/* Song Information */}
              <div className="my-3.5 p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[210px] sm:max-w-xs">
                      {selectedLevel.songTitle}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      BPM: {selectedLevel.bpm} • Dynamic Beat Synced
                    </div>
                  </div>
                </div>

                {!selectedLevel.isEndless && (
                  <a
                    href={selectedLevel.songUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-blue-400 transition-colors cursor-pointer"
                    title="Listen on Newgrounds"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Chamber Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block">Nests</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {selectedLevel.spawnerCount} Anthills
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block">Max Ants</span>
                  <span className="text-xs font-bold font-mono text-blue-400">
                    ~{selectedLevel.maxAnts}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block">Ant Scale</span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      selectedLevel.difficulty === 'Crazy'
                        ? 'text-rose-400'
                        : selectedLevel.difficulty === 'Insane'
                        ? 'text-purple-300'
                        : selectedLevel.difficulty === 'Harder'
                        ? 'text-indigo-300'
                        : selectedLevel.difficulty === 'Hard'
                        ? 'text-blue-300'
                        : selectedLevel.difficulty === 'Normal'
                        ? 'text-cyan-300'
                        : 'text-neutral-300'
                    }`}
                  >
                    {DIFFICULTY_ANT_SCALING[selectedLevel.difficulty]?.label.split(' ')[0] || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Crazy Level Titan Modifier Banner */}
              {selectedLevel.difficulty === 'Crazy' && (
                <div className="mb-3.5 p-3 rounded-2xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-2 text-xs text-rose-200">
                  <Crown className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300 font-mono">2 BIG TITAN ANTS ACTIVE:</span>
                    <p className="text-[11px] text-rose-200/80 mt-0.5 leading-snug">
                      Two giant armored Titans roam the chamber, projecting rallying pheromone auras to speed up the swarm!
                    </p>
                  </div>
                </div>
              )}

              {/* Personal Best High Score */}
              {personalBest > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs font-mono mb-3.5">
                  <span className="text-neutral-500">PERSONAL RECORD:</span>
                  <span className="font-bold text-blue-400">{personalBest.toLocaleString()} PTS</span>
                </div>
              )}

              {/* Launch / Play Button */}
              {selectedLevel.isEndless && !allLevelsBeaten ? (
                <div className="text-center p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-neutral-500" />
                  Beat all 23 levels to unlock Endless Free Mode! ({beatenLevelsCount} / 23 beaten)
                </div>
              ) : (
                <button
                  onClick={handleStartLevel}
                  className="w-full py-3.5 rounded-2xl font-black font-['Russo_One'] text-base tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-600/30"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {selectedLevel.isEndless ? 'START ENDLESS RANDOMIZER' : 'PLAY CHAMBER'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
