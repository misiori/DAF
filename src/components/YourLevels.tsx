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
  Upload,
  Type,
  X,
} from 'lucide-react';
import {
  CustomLevel,
  fetchUserCreatedLevels,
  getLocalUserDrafts,
  deleteCustomLevelDraft,
  renameCustomLevel,
  publishCustomLevel,
  getCustomLevelProgress,
  getCustomLevelHighScore,
  isMobileDevice,
} from '../lib/customLevels';
import { PlayerProfile } from '../types/game';
import { DIFFICULTY_COLORS } from '../lib/constants';
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
  const [renamingLevel, setRenamingLevel] = useState<CustomLevel | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [deletingLevel, setDeletingLevel] = useState<CustomLevel | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadLevels = async () => {
    const list = await fetchUserCreatedLevels(profile);
    setLevels(list);
  };

  useEffect(() => {
    setLevels(getLocalUserDrafts(profile));
    loadLevels();
  }, [profile.id]);

  const handleDeleteClick = (lvl: CustomLevel) => {
    sound.playClick();
    setDeletingLevel(lvl);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLevel) return;
    const target = deletingLevel;
    setIsDeleting(true);
    sound.playHitSound();

    // Optimistically remove from state immediately
    setLevels((prev) => prev.filter((l) => l.id !== target.id));
    setDeletingLevel(null);
    setIsDeleting(false);

    setFeedbackMsg(`chamber "${target.name}" deleted`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    await deleteCustomLevelDraft(target.id, profile);
    loadLevels();
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

  const handleStartRename = (lvl: CustomLevel) => {
    sound.playClick();
    setRenamingLevel(lvl);
    setRenameInput(lvl.name);
  };

  const handleConfirmRename = async (andRepublish = false) => {
    if (!renamingLevel || !renameInput.trim()) return;
    sound.playClick();
    const res = await renameCustomLevel(renamingLevel.id, renameInput, profile);
    if (res.success && res.level) {
      if (andRepublish && res.level.verified) {
        setPublishingId(res.level.id);
        const pubRes = await publishCustomLevel(res.level, profile);
        setPublishingId(null);
        if (pubRes.success) {
          sound.playVictory();
          setFeedbackMsg(`chamber renamed to "${res.level.name}" & republished!`);
        } else {
          setFeedbackMsg(`renamed, but publish note: ${pubRes.error}`);
        }
      } else {
        sound.playPowerUpSound();
        setFeedbackMsg(`chamber renamed to "${res.level.name}". verified status preserved!`);
      }
      setTimeout(() => setFeedbackMsg(null), 3500);
      setRenamingLevel(null);
      loadLevels();
    }
  };

  const handleQuickPublish = async (lvl: CustomLevel) => {
    sound.playClick();
    setPublishingId(lvl.id);
    const res = await publishCustomLevel(lvl, profile);
    setPublishingId(null);
    if (res.success) {
      sound.playVictory();
      setFeedbackMsg(`chamber "${lvl.name}" published to the library!`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      loadLevels();
    }
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

      {feedbackMsg && (
        <div className="relative z-20 my-2 p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 font-['Patrick_Hand'] text-base lowercase text-center animate-fade-in">
          {feedbackMsg}
        </div>
      )}

      {/* Levels List */}
      <div className="relative z-10 flex-1 py-3 pr-1">
        {levels.length === 0 ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
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
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <h3 className="font-['Caveat'] text-2xl sm:text-3xl text-white lowercase leading-tight truncate">
                          {lvl.name}
                        </h3>
                        <button
                          onClick={() => handleStartRename(lvl)}
                          className="p-1 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/80 transition-colors"
                          title="rename chamber (preserves verification!)"
                        >
                          <Type className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(() => {
                          const diffLabel =
                            (lvl.difficulty && lvl.difficulty !== 'Unrated')
                              ? lvl.difficulty
                              : ((lvl.powerUpChances as any)?.difficulty || 'Normal');
                          const diffColor = DIFFICULTY_COLORS[diffLabel] || '#38bdf8';
                          return (
                            <span
                              className="text-xs font-['Patrick_Hand'] lowercase px-2 py-0.5 rounded-full border shrink-0 font-bold"
                              style={{
                                color: diffColor,
                                borderColor: `${diffColor}50`,
                                backgroundColor: `${diffColor}15`,
                              }}
                            >
                              {diffLabel.toLowerCase()}
                            </span>
                          );
                        })()}

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
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-900">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onPlayLevel(lvl, false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-neutral-950" />
                      <span>play</span>
                    </button>

                    {/* Direct republish / publish button if verified */}
                    {lvl.verified && (
                      <button
                        onClick={() => handleQuickPublish(lvl)}
                        disabled={publishingId === lvl.id}
                        className="py-1.5 px-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-['Patrick_Hand'] text-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        title="republish chamber with current name"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{publishingId === lvl.id ? 'publishing...' : lvl.published ? 'republish' : 'publish'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        sound.playClick();
                        handleEdit(lvl);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-['Patrick_Hand'] text-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteClick(lvl)}
                      className="p-1.5 rounded-xl hover:bg-neutral-900 text-neutral-500 hover:text-rose-400 border border-transparent hover:border-neutral-800 transition-colors cursor-pointer"
                      title="delete chamber"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingLevel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) setDeletingLevel(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-rose-800/60 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <h3 className="font-['Caveat'] text-3xl text-neutral-100 lowercase">
                  delete chamber?
                </h3>
                <button
                  onClick={() => {
                    if (!isDeleting) setDeletingLevel(null);
                  }}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="font-['Patrick_Hand'] text-base text-neutral-300 lowercase leading-relaxed">
                are u sure u want to delete <span className="text-white font-bold font-['Caveat'] text-2xl">"{deletingLevel.name}"</span>? this will permanently remove it from your levels.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingLevel(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-base lowercase cursor-pointer transition-all border border-neutral-700"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-['Patrick_Hand'] text-base lowercase font-bold cursor-pointer transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'deleting...' : 'delete'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renamingLevel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setRenamingLevel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-700 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <h3 className="font-['Caveat'] text-3xl text-neutral-100 lowercase">
                  rename chamber
                </h3>
                <button
                  onClick={() => setRenamingLevel(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  maxLength={28}
                  placeholder="enter chamber name..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-neutral-950 border border-neutral-700 focus:border-white text-white font-['Caveat'] text-2xl lowercase outline-none"
                  autoFocus
                />
                <p className="text-xs font-['Patrick_Hand'] text-emerald-400 lowercase">
                  ✓ verified status is preserved. no re-verification needed!
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleConfirmRename(false)}
                  className="w-full py-2.5 rounded-2xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold shadow-md cursor-pointer transition-all"
                >
                  save name
                </button>
                {renamingLevel.verified && (
                  <button
                    onClick={() => handleConfirmRename(true)}
                    className="w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-['Patrick_Hand'] text-base font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>save & republish now</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Monitor className="w-8 h-8" />
              </div>
              <h3 className="font-['Caveat'] text-3xl text-neutral-200 lowercase">
                sorry! u can build just on computers.
              </h3>
              <p className="font-['Patrick_Hand'] text-base text-neutral-400 lowercase">
                chamber editing requires mouse precision for placing anthills and cocoons.
              </p>
              <button
                onClick={() => setMobileWarning(false)}
                className="w-full py-2 rounded-2xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold cursor-pointer transition-all"
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
