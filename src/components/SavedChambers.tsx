import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Play,
  BookmarkCheck,
  BookmarkX,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  CustomLevel,
  fetchSavedChambers,
  toggleSaveChamber,
  getCustomLevelProgress,
  getCustomLevelHighScore,
} from '../lib/customLevels';
import { PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';
import { DIFFICULTY_COLORS } from '../lib/constants';
import { isMisioriUser } from '../lib/supabase';

interface SavedChambersProps {
  profile: PlayerProfile;
  onPlayLevel: (level: CustomLevel) => void;
  onGoToDiscover: () => void;
  onBack: () => void;
  onOpenCreatorProfile?: (username: string) => void;
}

export const SavedChambers: React.FC<SavedChambersProps> = ({
  profile,
  onPlayLevel,
  onGoToDiscover,
  onBack,
  onOpenCreatorProfile,
}) => {
  const [levels, setLevels] = useState<CustomLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = async () => {
    setLoading(true);
    const data = await fetchSavedChambers();
    setLevels(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleRemove = (lvlId: string) => {
    sound.playClick();
    toggleSaveChamber(lvlId);
    loadSaved();
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-neutral-100 flex flex-col p-3 sm:p-5 select-none overscroll-none">
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 border-b border-neutral-800/80 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer font-['Patrick_Hand'] text-base lowercase"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
          <span>chambers</span>
        </button>

        <h1 className="font-['Caveat'] text-3xl sm:text-4xl text-neutral-200 lowercase">
          saved
        </h1>

        <button
          onClick={() => {
            sound.playClick();
            onGoToDiscover();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-base lowercase cursor-pointer"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>discover</span>
        </button>
      </div>

      {/* Saved Chambers List */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto py-3 pr-1">
        {loading ? (
          <div className="h-full flex items-center justify-center font-['Patrick_Hand'] text-lg text-neutral-500 lowercase">
            loading saved chambers...
          </div>
        ) : levels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <BookmarkCheck className="w-12 h-12 text-neutral-600" />
            <h3 className="font-['Caveat'] text-3xl text-neutral-400 lowercase">
              no saved chambers yet!
            </h3>
            <p className="font-['Patrick_Hand'] text-base text-neutral-500 lowercase max-w-sm">
              explore the discover feed to save your favorite community chambers.
            </p>
            <button
              onClick={() => {
                sound.playClick();
                onGoToDiscover();
              }}
              className="mt-2 px-5 py-2 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold shadow-md cursor-pointer hover:scale-105 transition-all"
            >
              go to discover
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {levels.map((lvl) => {
              const diffColor =
                lvl.difficulty === 'Unrated'
                  ? '#94a3b8'
                  : DIFFICULTY_COLORS[lvl.difficulty as any] || '#38bdf8';

              const progress = getCustomLevelProgress(profile, lvl);
              const highScore = getCustomLevelHighScore(profile, lvl);
              const isBeaten = progress >= 100;
              const isCreatorMisiori = isMisioriUser(lvl.creatorUsername);

              return (
                <motion.div
                  key={lvl.id}
                  whileHover={{ scale: 1.01 }}
                  className="relative p-3.5 sm:p-4 rounded-3xl bg-neutral-950/80 border border-neutral-800/90 flex flex-col justify-between space-y-3 hover:border-neutral-600 transition-all shadow-md group"
                >
                  <div>
                    {/* Header: Title & Difficulty Badge */}
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-['Caveat'] text-2xl text-white lowercase leading-tight truncate">
                        {lvl.name}
                      </h3>

                      <span
                        className="text-xs font-['Patrick_Hand'] lowercase px-2 py-0.5 rounded-full border shrink-0"
                        style={{
                          color: diffColor,
                          borderColor: `${diffColor}40`,
                          backgroundColor: `${diffColor}15`,
                        }}
                      >
                        {lvl.difficulty.toLowerCase()}
                      </span>
                    </div>

                    {/* Creator clickable -> opens profile */}
                    <div className="flex items-center gap-1.5 text-sm font-['Patrick_Hand'] text-neutral-400 lowercase mb-2">
                      <button
                        onClick={() => {
                          sound.playClick();
                          if (onOpenCreatorProfile) {
                            onOpenCreatorProfile(lvl.creatorUsername);
                          }
                        }}
                        className="flex items-center gap-1 text-neutral-300 hover:text-white underline-offset-2 hover:underline cursor-pointer transition-colors"
                        title={`view ${lvl.creatorUsername}'s profile`}
                      >
                        <span>by {lvl.creatorUsername}</span>
                        {isCreatorMisiori && (
                          <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-neutral-950 inline-block shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Progress (Green if 100%) & Best PTS */}
                    <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] lowercase pt-2 border-t border-neutral-900">
                      <span className={isBeaten ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                        {isBeaten ? '100%' : `${progress}%`}
                      </span>
                      <span className="text-neutral-400">
                        best: {highScore.toLocaleString()} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onPlayLevel(lvl);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-neutral-950" />
                      <span>play</span>
                    </button>

                    <button
                      onClick={() => handleRemove(lvl.id)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition-colors cursor-pointer"
                      title="remove from saved"
                    >
                      <BookmarkX className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
