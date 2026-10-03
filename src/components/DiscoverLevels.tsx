import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Play,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Star,
  X,
} from 'lucide-react';
import {
  CustomLevel,
  CustomLevelDifficulty,
  fetchDiscoverLevels,
  fetchSavedChambers,
  getSavedChamberIds,
  toggleSaveChamber,
  rateLevelDifficulty,
  deleteCommunityLevel,
  getCustomLevelProgress,
  getCustomLevelHighScore,
} from '../lib/customLevels';
import { PlayerProfile } from '../types/game';
import { sound } from '../lib/audio';
import { isMisioriUser } from '../lib/supabase';
import { DIFFICULTY_COLORS } from '../lib/constants';

interface DiscoverLevelsProps {
  profile: PlayerProfile;
  onPlayLevel: (level: CustomLevel, isVerification?: boolean) => void;
  onBack: () => void;
  onOpenCreatorProfile?: (username: string) => void;
  initialTab?: 'discover' | 'saved';
}

export const DiscoverLevels: React.FC<DiscoverLevelsProps> = ({
  profile,
  onPlayLevel,
  onBack,
  onOpenCreatorProfile,
  initialTab = 'discover',
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>(initialTab);
  const [levels, setLevels] = useState<CustomLevel[]>([]);
  const [savedLevels, setSavedLevels] = useState<CustomLevel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Rating modal for @misiori
  const [ratingLevel, setRatingLevel] = useState<CustomLevel | null>(null);

  const isMisiori = isMisioriUser(profile.username, profile.email);

  const loadLevels = async () => {
    setLoading(true);
    const [discoverData, savedData] = await Promise.all([
      fetchDiscoverLevels(searchQuery, filterDifficulty),
      fetchSavedChambers(),
    ]);
    setLevels(discoverData);
    setSavedLevels(savedData);
    setSavedIds(getSavedChamberIds());
    setLoading(false);
  };

  useEffect(() => {
    loadLevels();
  }, [searchQuery, filterDifficulty]);

  const handleToggleSave = (lvlId: string) => {
    sound.playClick();
    toggleSaveChamber(lvlId);
    const updatedIds = getSavedChamberIds();
    setSavedIds(updatedIds);
    fetchSavedChambers().then(setSavedLevels);
  };

  const handleRate = async (lvl: CustomLevel, newDiff: CustomLevelDifficulty) => {
    sound.playClick();
    if (!isMisiori) return;
    await rateLevelDifficulty(lvl.id, newDiff, profile);
    setRatingLevel(null);
    loadLevels();
  };

  const handleDelete = async (lvl: CustomLevel) => {
    sound.playClick();
    if (!isMisiori) return;
    if (confirm(`@misiori: delete inappropriate chamber "${lvl.name}"?`)) {
      await deleteCommunityLevel(lvl.id, profile);
      loadLevels();
    }
  };

  const difficulties: CustomLevelDifficulty[] = [
    'Unrated',
    'Easy',
    'Normal',
    'Hard',
    'Harder',
    'Insane',
    'Crazy',
  ];

  // In "saved" tab, filter the saved chambers by search and difficulty
  const displayedSavedLevels = savedLevels.filter((lvl) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const match =
        lvl.name.toLowerCase().includes(q) ||
        lvl.creatorUsername.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterDifficulty !== 'all') {
      if (lvl.difficulty.toLowerCase() !== filterDifficulty.toLowerCase()) return false;
    }
    return true;
  });

  const displayedList = activeTab === 'discover' ? levels : displayedSavedLevels;

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-neutral-100 flex flex-col p-3 sm:p-5 select-none overscroll-none">
      {/* Top Bar with Discover / Saved Header Selector */}
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

        {/* Single Switch Button: toggles between discover and saved */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab((prev) => (prev === 'discover' ? 'saved' : 'discover'));
          }}
          className="flex items-center gap-2 px-5 py-1 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-400 text-neutral-100 transition-all cursor-pointer shadow-md group"
          title="click to switch between discover and saved"
        >
          <span className="font-['Caveat'] text-3xl sm:text-4xl lowercase font-bold text-white group-hover:scale-105 transition-transform">
            {activeTab}
          </span>
          <span className="text-xs font-['Patrick_Hand'] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 group-hover:text-neutral-200 border border-neutral-700/60 lowercase flex items-center gap-1">
            <span>switch to {activeTab === 'discover' ? 'saved' : 'discover'}</span>
            {activeTab === 'discover' && savedIds.length > 0 && (
              <span className="text-amber-400 font-bold">({savedIds.length})</span>
            )}
          </span>
        </button>

        <div className="w-20 flex justify-end">
          {isMisiori && (
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-['Patrick_Hand'] lowercase">
              @misiori
            </span>
          )}
        </div>
      </div>

      {/* Search and Difficulty Filter Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 py-2.5 shrink-0">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'discover'
                ? 'search chamber name or creator...'
                : 'search saved chambers...'
            }
            className="w-full pl-9 pr-4 py-1.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 font-['Patrick_Hand'] text-base outline-none focus:border-neutral-500 transition-all lowercase"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {['all', 'unrated', 'easy', 'normal', 'hard', 'harder', 'insane', 'crazy'].map(
            (diff) => {
              const active = filterDifficulty === diff;
              const color =
                diff === 'all'
                  ? '#ffffff'
                  : diff === 'unrated'
                  ? '#94a3b8'
                  : DIFFICULTY_COLORS[
                      (diff.charAt(0).toUpperCase() + diff.slice(1)) as any
                    ] || '#38bdf8';

              return (
                <button
                  key={diff}
                  onClick={() => {
                    sound.playClick();
                    setFilterDifficulty(diff);
                  }}
                  className={`px-3 py-1 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] font-['Patrick_Hand'] text-sm lowercase whitespace-nowrap cursor-pointer transition-all border ${
                    active
                      ? 'bg-neutral-200 text-neutral-950 font-bold border-white'
                      : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  style={active ? {} : { color }}
                >
                  {diff}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Levels Feed */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 pb-3">
        {loading ? (
          <div className="h-full flex items-center justify-center font-['Patrick_Hand'] text-lg text-neutral-500 lowercase">
            loading chambers...
          </div>
        ) : displayedList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <h3 className="font-['Caveat'] text-3xl text-neutral-400 lowercase">
              {activeTab === 'discover'
                ? 'no chambers found'
                : 'no saved chambers yet'}
            </h3>
            <p className="font-['Patrick_Hand'] text-sm text-neutral-500 lowercase">
              {activeTab === 'discover'
                ? 'be the first to create and publish a chamber!'
                : 'save chambers from the discover feed to play them anytime!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedList.map((lvl) => {
              const isSaved = savedIds.includes(lvl.id);
              const isCreatorMisiori =
                lvl.creatorUsername.toLowerCase().includes('misiori') ||
                lvl.creatorId === 'creator_misiori';
              const diffColor =
                lvl.difficulty === 'Unrated'
                  ? '#94a3b8'
                  : DIFFICULTY_COLORS[lvl.difficulty as any] || '#38bdf8';

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
                    {/* Header: Title & Difficulty Badge (No color tags) */}
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

                    {/* Progress (Green if 100%) and Best PTS */}
                    <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] lowercase pt-1 border-t border-neutral-900">
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
                        onPlayLevel(lvl);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-neutral-950" />
                      <span>play</span>
                    </button>

                    {/* Save to chambers */}
                    <button
                      onClick={() => handleToggleSave(lvl.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800'
                      }`}
                      title={isSaved ? 'remove from saved' : 'save to chambers'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    {/* @misiori ONLY: Rate Difficulty & Delete Buttons */}
                    {isMisiori && (
                      <div className="flex items-center gap-1 border-l border-neutral-800 pl-1">
                        <button
                          onClick={() => setRatingLevel(lvl)}
                          className="p-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-400 border border-sky-800/80 transition-colors cursor-pointer"
                          title="@misiori: rate level difficulty"
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(lvl)}
                          className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-800/80 transition-colors cursor-pointer"
                          title="@misiori: delete inappropriate level"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* @misiori Difficulty Rating Modal */}
      <AnimatePresence>
        {ratingLevel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setRatingLevel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-sky-600/60 p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-['Caveat'] text-2xl text-white lowercase">
                    rate chamber difficulty
                  </h3>
                  <p className="text-xs font-['Patrick_Hand'] text-sky-300 lowercase">
                    @misiori verified rating
                  </p>
                </div>
                <button
                  onClick={() => setRatingLevel(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm font-['Patrick_Hand'] text-neutral-300 lowercase">
                chamber: <span className="text-white font-bold">{ratingLevel.name}</span>
              </p>

              <div className="grid grid-cols-2 gap-2">
                {difficulties.map((diff) => {
                  const color =
                    diff === 'Unrated'
                      ? '#94a3b8'
                      : DIFFICULTY_COLORS[diff as any] || '#38bdf8';
                  const isCurrent = ratingLevel.difficulty === diff;

                  return (
                    <button
                      key={diff}
                      onClick={() => handleRate(ratingLevel, diff)}
                      className={`p-2.5 rounded-xl border font-['Patrick_Hand'] text-sm lowercase transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-neutral-800 text-white font-bold border-white'
                          : 'bg-neutral-950/70 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                      }`}
                      style={{ color }}
                    >
                      <span>{diff.toLowerCase()}</span>
                      {isCurrent && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
