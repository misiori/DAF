import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Monitor,
} from 'lucide-react';
import {
  CustomLevel,
  fetchUserCreatedLevels,
  getLocalUserDrafts,
  deleteCustomLevelDraft,
  getCustomLevelProgress,
  getCustomLevelHighScore,
  isMobileDevice,
} from '../lib/customLevels';
import { PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';

interface YourLevelsProps {
  profile: PlayerProfile;
  onCreateNew: () => void;
  onEditLevel: (level: CustomLevel) => void;
  onPlayLevel: (level: CustomLevel, isVerification?: boolean) => void;
  onBack: () => void;
}

export const YourLevels: React.FC<YourLevelsProps> = ({
  profile,
  onCreateNew,
  onEditLevel,
  onPlayLevel,
  onBack,
}) => {
  const [levels, setLevels] = useState<CustomLevel[]>(() => getLocalUserDrafts(profile));
  const [mobileWarning, setMobileWarning] = useState<boolean>(false);

  const loadLevels = async () => {
    if (!profile || profile.id === 'guest' || profile.id.startsWith('guest_')) {
      setLevels([]);
      return;
    }
    const list = await fetchUserCreatedLevels(profile);
    setLevels(list);
  };

  useEffect(() => {
    loadLevels();
  }, [profile.id]);

  const handleDelete = async (id: string, name: string) => {
    sound.playClick();
    if (confirm(`delete chamber "${name}"?`)) {
      await deleteCustomLevelDraft(id, profile);
      loadLevels();
    }
  };

  const handleCreate = () => {
    if (isMobileDevice()) {
      sound.playHitSound();
      setMobileWarning(true);
      return;
    }
    onCreateNew();
  };

  const handleEdit = (lvl: CustomLevel) => {
    if (isMobileDevice()) {
      sound.playHitSound();
      setMobileWarning(true);
      return;
    }
    onEditLevel(lvl);
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
          ur levels
        </h1>

        <button
          onClick={() => {
            sound.playClick();
            handleCreate();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold shadow-md cursor-pointer hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>create new</span>
        </button>
      </div>

      {/* Levels List */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto py-3 pr-1">
        {levels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-neutral-500">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="font-['Caveat'] text-3xl text-neutral-300 lowercase">
              u have no levels yet!
            </h2>
            <p className="font-['Patrick_Hand'] text-base text-neutral-500 lowercase max-w-sm">
              design ur own chamber with custom anthills, cocoons, bosses, and power-up chances.
            </p>
            <button
              onClick={() => {
                sound.playClick();
                handleCreate();
              }}
              className="px-6 py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-lg font-bold shadow-lg cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>create first level</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {levels.map((lvl) => {
              const progress = getCustomLevelProgress(profile, lvl);
              const highScore = getCustomLevelHighScore(profile, lvl);
              const isBeaten = progress >= 100;

              return (
                <motion.div
                  key={lvl.id}
                  whileHover={{ scale: 1.01 }}
                  className="relative p-3.5 sm:p-4 rounded-3xl bg-neutral-950/80 border border-neutral-800/90 flex flex-col justify-between space-y-3 hover:border-neutral-600 transition-all shadow-md group"
                >
                  <div>
                    {/* Header: Name & Status badges */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-['Caveat'] text-2xl sm:text-3xl text-white lowercase leading-tight truncate">
                        {lvl.name}
                      </h3>

                      <div className="flex items-center gap-1 shrink-0">
                        {lvl.verified ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-['Patrick_Hand'] lowercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>verified</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-['Patrick_Hand'] lowercase flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>unverified</span>
                          </span>
                        )}

                        {lvl.published && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-['Patrick_Hand'] lowercase">
                            published
                          </span>
                        )}
                      </div>
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

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onPlayLevel(lvl, false);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-neutral-950" />
                      <span>play</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        handleEdit(lvl);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-['Patrick_Hand'] text-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(lvl.id, lvl.name)}
                      className="p-1.5 rounded-xl hover:bg-neutral-900 text-neutral-500 hover:text-rose-400 border border-transparent hover:border-neutral-800 transition-colors cursor-pointer"
                      title="delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
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
