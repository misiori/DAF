import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Search,
  Check,
  Trophy,
  Cookie,
  AlertCircle,
  Sparkles,
  Award,
  Flame,
  Medal,
  Camera,
  CheckCircle2,
  Trash2,
  Edit2,
  Compass,
  Play,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  supabase,
  searchProfiles,
  findEmailByUsername,
  fetchProfileById,
  fetchLeaderboard,
  isUsernameTaken,
  updateProfile,
  mergeProfiles,
  saveGuestProfile,
} from '../lib/supabase';
import { PlayerProfile } from '../types/game';
import {
  CustomLevel,
  fetchLevelsByCreator,
  getSavedChamberIds,
  toggleSaveChamber,
  getCustomLevelProgress,
  getCustomLevelHighScore,
  clearDeviceCustomLevels,
} from '../lib/customLevels';
import { SkinRenderer, getSkinById } from './SkinRenderer';
import { LEVELS, DIFFICULTY_COLORS } from '../lib/constants';
import { sound } from '../lib/audio';

const isMisioriUser = (username?: string, email?: string) => {
  const clean = (username || '').toLowerCase().trim().replace(/^@/, '');
  return clean === 'misiori' || (email && email.toLowerCase() === 'misiori.gg@gmail.com');
};

interface ProfileModalProps {
  currentProfile: PlayerProfile;
  onProfileUpdated: (updated: PlayerProfile) => void;
  onPlayCustomLevel?: (level: CustomLevel) => void;
  onClose: () => void;
  initialViewedUsername?: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentProfile,
  onProfileUpdated,
  onPlayCustomLevel,
  onClose,
  initialViewedUsername,
}) => {
  const [tab, setTab] = useState<'profile' | 'leaderboard' | 'search'>('profile');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Player levels sub-view state
  const [viewingPlayerLevels, setViewingPlayerLevels] = useState<{
    username: string;
    levels: CustomLevel[];
    loading: boolean;
  } | null>(null);
  const [savedChamberIds, setSavedChamberIds] = useState<string[]>(getSavedChamberIds());

  // Auth Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Player Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [viewedPlayer, setViewedPlayer] = useState<PlayerProfile | null>(null);
  const [showSkinInViewedProfile, setShowSkinInViewedProfile] = useState(false);

  // Auto load profile if initialViewedUsername passed
  useEffect(() => {
    if (initialViewedUsername) {
      const cleanTarget = initialViewedUsername.trim().toLowerCase().replace(/^@/, '');
      if (cleanTarget === currentProfile.username.toLowerCase().replace(/^@/, '')) {
        setTab('profile');
        setViewedPlayer(null);
      } else {
        setTab('search');
        setSearching(true);
        searchProfiles(cleanTarget).then((results) => {
          setSearching(false);
          const match = results.find(
            (p) => p.username.toLowerCase().replace(/^@/, '') === cleanTarget
          );
          if (match) {
            setViewedPlayer(match);
          } else if (results.length > 0) {
            setViewedPlayer(results[0]);
          } else {
            setViewedPlayer({
              id: 'creator_' + cleanTarget,
              username: initialViewedUsername,
              active_skin: 'amber',
              unlocked_skins: ['amber'],
              sugar_cubes: 0,
              high_scores: {},
              beaten_levels: [],
              level_progress: {},
            });
          }
        });
      }
    }
  }, [initialViewedUsername]);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<
    (PlayerProfile & { total_pts: number; levels_cleared: number })[]
  >([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Username editing & custom avatar state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(currentProfile.username);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar file must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        const updated: PlayerProfile = {
          ...currentProfile,
          avatar_url: dataUrl,
        };
        onProfileUpdated(updated);
        sound.playVictory();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const updated: PlayerProfile = {
      ...currentProfile,
      avatar_url: undefined,
    };
    onProfileUpdated(updated);
    sound.playClick();
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) return;

    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      sound.playHitSound();
      return;
    }

    if (trimmed.length > 18) {
      setUsernameError('Username must be 18 characters or less');
      sound.playHitSound();
      return;
    }

    // If identical including case
    if (trimmed === currentProfile.username) {
      setEditingUsername(false);
      setUsernameError(null);
      return;
    }

    // Protect @misiori / misiori
    const cleanCandidate = trimmed.toLowerCase().replace(/^@/, '');
    if (cleanCandidate === 'misiori' && !isMisioriUser(currentProfile.username, currentProfile.email)) {
      setUsernameError('The @misiori username is reserved for the verified creator.');
      sound.playHitSound();
      return;
    }

    setUsernameSaving(true);
    setUsernameError(null);

    // Enforce case-insensitive uniqueness check against database
    const isTaken = await isUsernameTaken(trimmed, currentProfile.id);
    if (isTaken) {
      setUsernameError(`"${trimmed}" is already taken (usernames are case-insensitive).`);
      setUsernameSaving(false);
      sound.playHitSound();
      return;
    }

    const updated: PlayerProfile = {
      ...currentProfile,
      username: trimmed,
    };
    onProfileUpdated(updated);
    setEditingUsername(false);
    setUsernameSaving(false);
    sound.playVictory();
  };

  const isLoggedIn = currentProfile.id !== 'guest' && !currentProfile.id.startsWith('guest_');

  // Calculate total PTS for current profile including daily challenge bonus points
  const bonusPts = currentProfile.bonus_pts || 0;
  const highScoresPts = Object.values(currentProfile.high_scores || {}).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  const totalPts = highScoresPts + bonusPts;

  // Calculate levels beaten by difficulty (ONLY chambers beaten 100% till the end)
  const beatenNumList = (currentProfile.beaten_levels || []).map(Number);
  const difficulties = ['Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Crazy'] as const;
  const statsByDiff = difficulties.map((diff) => {
    const lvlsInDiff = LEVELS.filter((l) => l.difficulty === diff);
    const beatenCount = lvlsInDiff.filter((l) => {
      if (beatenNumList.includes(Number(l.id))) return true;
      const prog = currentProfile.level_progress?.[l.id] ?? currentProfile.level_progress?.[String(l.id)] ?? 0;
      return Number(prog) >= 100;
    }).length;
    return {
      difficulty: diff,
      beaten: beatenCount,
      total: lvlsInDiff.length,
      color: DIFFICULTY_COLORS[diff] || '#3b82f6',
    };
  });
  const totalChambersBeaten = statsByDiff.reduce((a, b) => a + b.beaten, 0);

  // Load Leaderboard when clicking tab
  useEffect(() => {
    if (tab === 'leaderboard') {
      setLoadingLeaderboard(true);
      fetchLeaderboard().then((data) => {
        // If data from Supabase is empty, show current user as entry
        if (!data || data.length === 0) {
          setLeaderboard([
            {
              ...currentProfile,
              total_pts: totalPts,
              levels_cleared: totalChambersBeaten,
            },
          ]);
        } else {
          setLeaderboard(data);
        }
        setLoadingLeaderboard(false);
      });
    }
  }, [tab, currentProfile, totalPts, totalChambersBeaten]);

  // Handle Search
  useEffect(() => {
    if (tab !== 'search') return;
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setSearching(true);
        const results = await searchProfiles(searchQuery);
        setSearchResults(results);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, tab]);

  // Sign In handler (Supports username OR email)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const loginIdentifier = usernameInput.trim();
      let emailToUse = loginIdentifier;

      if (!loginIdentifier.includes('@')) {
        const resolvedEmail = await findEmailByUsername(loginIdentifier);
        if (!resolvedEmail) {
          throw new Error(`No user found with username "${loginIdentifier}". Try signing up first!`);
        }
        emailToUse = resolvedEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: passwordInput,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        sound.playVictory();
        const cloudProfile = await fetchProfileById(data.user.id);
        if (cloudProfile) {
          // Only merge guest progress into account; never merge across different user accounts
          let finalProfile = cloudProfile;
          if (currentProfile.id === 'guest' || currentProfile.id.startsWith('guest_')) {
            finalProfile = mergeProfiles(cloudProfile, currentProfile);
            await updateProfile(data.user.id, finalProfile);
          }
          onProfileUpdated(finalProfile);
        } else {
          const fallbackProfile: PlayerProfile = {
            id: data.user.id,
            username: loginIdentifier.replace(/@.*$/, ''),
            email: emailToUse,
            active_skin: 'amber',
            unlocked_skins: ['amber'],
            sugar_cubes: 0,
            high_scores: {},
            beaten_levels: [],
            level_progress: {},
            bonus_pts: 0,
          };
          onProfileUpdated(fallbackProfile);
          await updateProfile(data.user.id, fallbackProfile);
        }
        setAuthSuccessMsg('Signed in successfully!');
      }
    } catch (err: unknown) {
      sound.playHitSound();
      const message = err instanceof Error ? err.message : 'Failed to sign in. Check credentials.';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign Up handler (Requires username, email, password + email verification)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const trimmedUser = usernameInput.trim();
      const trimmedEmail = emailInput.trim();

      if (!trimmedUser || !trimmedEmail || !passwordInput) {
        throw new Error('Please fill in username, email, and password.');
      }

      if (trimmedUser.length < 3) {
        throw new Error('Username must be at least 3 characters long.');
      }
      if (trimmedUser.length > 18) {
        throw new Error('Username must be 18 characters or less.');
      }

      const cleanUser = trimmedUser.toLowerCase().replace(/^@/, '');
      if (cleanUser === 'misiori' && trimmedEmail.toLowerCase() !== 'misiori.gg@gmail.com') {
        throw new Error('The @misiori username is reserved for the verified creator.');
      }

      // Check case-insensitive uniqueness
      const isTaken = await isUsernameTaken(trimmedUser);
      if (isTaken) {
        throw new Error(`Username "${trimmedUser}" is already taken (usernames are case-insensitive). Please choose another.`);
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: passwordInput,
        options: {
          data: {
            username: trimmedUser,
          },
        },
      });

      if (error) {
        throw error;
      }

      sound.playVictory();
      setAuthSuccessMsg(
        'Account created! A Supabase verification email has been sent. Please verify your email before logging in.'
      );

      if (data.user && data.session) {
        const freshProfile: PlayerProfile = {
          id: data.user.id,
          username: trimmedUser,
          email: trimmedEmail,
          active_skin: 'amber',
          unlocked_skins: ['amber'],
          sugar_cubes: 0,
          high_scores: {},
          beaten_levels: [],
          level_progress: {},
          bonus_pts: 0,
        };
        localStorage.removeItem('ant_farm_guest_profile_v2');
        localStorage.removeItem('ant_farm_guest_profile');
        onProfileUpdated(freshProfile);
        await updateProfile(data.user.id, freshProfile);
      }
    } catch (err: unknown) {
      sound.playHitSound();
      const message = err instanceof Error ? err.message : 'Sign up error. Please try again.';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    sound.playClick();
    await supabase.auth.signOut();
    localStorage.removeItem('ant_farm_guest_profile_v2');
    localStorage.removeItem('ant_farm_guest_profile');
    clearDeviceCustomLevels();
    const guest: PlayerProfile = {
      id: 'guest',
      username: 'Guest',
      active_skin: 'amber',
      unlocked_skins: ['amber'],
      sugar_cubes: 0,
      high_scores: {},
      beaten_levels: [],
      level_progress: {},
      bonus_pts: 0,
    };
    saveGuestProfile(guest);
    onProfileUpdated(guest);
  };

  const activeSkin = getSkinById(currentProfile.active_skin);

  const renderViewedPlayerCard = () => {
    if (!viewedPlayer) return null;
    const viewedPlayerPts =
      Object.values(viewedPlayer.high_scores || {}).reduce((a, b) => a + (Number(b) || 0), 0) +
      (viewedPlayer.bonus_pts || 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Instead of skin it shows avatar. When clicked it switches to skin */}
            <div
              onClick={() => {
                sound.playClick();
                setShowSkinInViewedProfile((prev) => !prev);
              }}
              className="relative cursor-pointer group shrink-0"
              title="click to switch avatar / skin"
            >
              {!showSkinInViewedProfile ? (
                viewedPlayer.avatar_url ? (
                  <img
                    src={viewedPlayer.avatar_url}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-neutral-700 group-hover:border-neutral-500 group-hover:scale-105 transition-all shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center group-hover:border-neutral-500 group-hover:scale-105 transition-all shadow-md">
                    <User className="w-7 h-7 text-neutral-400" />
                  </div>
                )
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border-2 border-neutral-600 flex items-center justify-center p-1 group-hover:border-neutral-500 group-hover:scale-105 transition-all shadow-md">
                  <SkinRenderer skinId={viewedPlayer.active_skin} size={46} animated />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-neutral-900/90 border border-neutral-700 text-[9px] font-['Patrick_Hand'] text-neutral-400 lowercase select-none">
                {showSkinInViewedProfile ? 'skin' : 'avatar'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-white font-['Patrick_Hand'] text-2xl leading-none">
                  {viewedPlayer.username}
                </h4>
                {isMisioriUser(viewedPlayer.username, viewedPlayer.email) && (
                  <span className="inline-flex items-center justify-center self-center" title="Verified @misiori">
                    <CheckCircle2 className="w-4 h-4 fill-sky-400 text-neutral-950 inline-block shrink-0" />
                  </span>
                )}
              </div>
              {/* Shows the pts quantity under the name instead of skin name */}
              <p className="text-base font-['Patrick_Hand'] text-neutral-300 mt-1 leading-none">
                {viewedPlayerPts.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Small X button to return to leaderboard or search results */}
          <button
            onClick={() => {
              sound.playClick();
              setViewedPlayer(null);
              setShowSkinInViewedProfile(false);
            }}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={tab === 'leaderboard' ? 'back to leaderboard' : 'back to search'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-2">
            <span>chambers beaten</span>
            <span className="text-sm font-['Patrick_Hand'] font-bold text-white">
              {
                LEVELS.filter((l) => {
                  const beatenSet = new Set((viewedPlayer.beaten_levels || []).map(Number));
                  return (
                    beatenSet.has(l.id) ||
                    (viewedPlayer.level_progress?.[l.id] || 0) >= 100
                  );
                }).length
              }
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {difficulties.map((diff) => {
              const lvlsInDiff = LEVELS.filter((l) => l.difficulty === diff);
              const beatenSet = new Set((viewedPlayer.beaten_levels || []).map(Number));
              const beaten = lvlsInDiff.filter(
                (l) =>
                  beatenSet.has(l.id) ||
                  (viewedPlayer.level_progress?.[l.id] || 0) >= 100
              ).length;
              return (
                <div
                  key={diff}
                  className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                >
                  <div
                    className="text-xs font-['Patrick_Hand'] lowercase"
                    style={{ color: DIFFICULTY_COLORS[diff] || '#3b82f6' }}
                  >
                    {diff.toLowerCase()}
                  </div>
                  <div className="text-sm font-['Patrick_Hand'] font-bold text-white">
                    {beaten}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Levels button to view and save their custom chambers */}
          <button
            onClick={async () => {
              sound.playClick();
              setViewingPlayerLevels({
                username: viewedPlayer.username,
                levels: [],
                loading: true,
              });
              const lvls = await fetchLevelsByCreator(viewedPlayer.username);
              setViewingPlayerLevels({
                username: viewedPlayer.username,
                levels: lvls,
                loading: false,
              });
            }}
            className="w-full mt-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 text-neutral-200 hover:text-white font-['Patrick_Hand'] text-sm lowercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>view levels by {viewedPlayer.username}</span>
          </button>
        </div>
      </motion.div>
    );
  };

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-neutral-900 border border-blue-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Caveat'] tracking-wide text-neutral-100 lowercase">
              profile
            </h2>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {viewingPlayerLevels ? (
          <div className="flex-1 min-h-0 flex flex-col pt-3 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 shrink-0">
              <button
                onClick={() => setViewingPlayerLevels(null)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-['Patrick_Hand'] text-sm lowercase hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-neutral-400" />
                <span>back</span>
              </button>
              <h3 className="font-['Caveat'] text-2xl text-white lowercase">
                chambers by {viewingPlayerLevels.username}
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2.5 pr-1">
              {viewingPlayerLevels.loading ? (
                <div className="h-40 flex items-center justify-center font-['Patrick_Hand'] text-neutral-500 lowercase">
                  loading chambers...
                </div>
              ) : viewingPlayerLevels.levels.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                  <p className="font-['Caveat'] text-2xl text-neutral-400 lowercase">
                    no chambers published yet
                  </p>
                </div>
              ) : (
                viewingPlayerLevels.levels.map((lvl) => {
                  const isSaved = savedChamberIds.includes(lvl.id);
                  const diffColor =
                    lvl.difficulty === 'Unrated'
                      ? '#94a3b8'
                      : DIFFICULTY_COLORS[lvl.difficulty as any] || '#38bdf8';
                  const progress = getCustomLevelProgress(currentProfile, lvl);
                  const highScore = getCustomLevelHighScore(currentProfile, lvl);
                  const isBeaten = progress >= 100;

                  return (
                    <div
                      key={lvl.id}
                      className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-['Caveat'] text-2xl text-white truncate lowercase">
                            {lvl.name}
                          </h4>
                          <span
                            className="text-[11px] font-['Patrick_Hand'] lowercase px-2 py-0.5 rounded-full border"
                            style={{
                              color: diffColor,
                              borderColor: `${diffColor}40`,
                              backgroundColor: `${diffColor}15`,
                            }}
                          >
                            {lvl.difficulty.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-['Patrick_Hand'] lowercase pt-0.5">
                          <span className={isBeaten ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                            {isBeaten ? '100%' : `${progress}%`}
                          </span>
                          <span className="text-neutral-400">
                            best: {highScore.toLocaleString()} pts
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onPlayCustomLevel && (
                          <button
                            onClick={() => {
                              sound.playClick();
                              onClose();
                              onPlayCustomLevel(lvl);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold flex items-center gap-1 cursor-pointer shadow hover:scale-105 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-neutral-950" />
                            <span>play</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            sound.playClick();
                            toggleSaveChamber(lvl.id);
                            setSavedChamberIds(getSavedChamberIds());
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isSaved
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                          }`}
                          title={isSaved ? 'saved to chambers' : 'save to chambers'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation: profile, leaderboard, search */}
            <div className="flex items-center gap-2 mt-3 p-1 bg-neutral-950/80 rounded-2xl border border-neutral-800">
          <button
            onClick={() => {
              sound.playClick();
              setTab('profile');
              setViewedPlayer(null);
              setShowSkinInViewedProfile(false);
            }}
            className={`flex-1 py-1.5 rounded-xl font-['Patrick_Hand'] text-base lowercase transition-all cursor-pointer ${
              tab === 'profile'
                ? 'bg-neutral-200 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            profile
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('leaderboard');
              setViewedPlayer(null);
              setShowSkinInViewedProfile(false);
            }}
            className={`flex-1 py-1.5 rounded-xl font-['Patrick_Hand'] text-base lowercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'leaderboard'
                ? 'bg-neutral-200 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            leaderboard
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('search');
              setViewedPlayer(null);
              setShowSkinInViewedProfile(false);
            }}
            className={`flex-1 py-1.5 rounded-xl font-['Patrick_Hand'] text-base lowercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'search'
                ? 'bg-neutral-200 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            search
          </button>
        </div>

        {/* Tab 1: Profile & Clearance Stats */}
        {tab === 'profile' && (
          <div className="mt-5 space-y-6 overflow-y-auto pr-1">
            {/* Active User Card */}
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="relative group shrink-0">
                {currentProfile.avatar_url ? (
                  <img
                    src={currentProfile.avatar_url}
                    alt="Custom Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400 shadow-lg shadow-blue-500/20"
                  />
                ) : (
                  <SkinRenderer skinId={currentProfile.active_skin} size={64} animated />
                )}
                <label className="absolute inset-0 bg-black/65 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-mono text-white text-center p-1">
                  <Camera className="w-4 h-4 text-blue-400 mb-0.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    {editingUsername ? (
                      <div>
                        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => {
                              setNewUsername(e.target.value);
                              setUsernameError(null);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-neutral-900 border border-blue-500 text-white font-mono text-sm font-bold focus:outline-none"
                            placeholder="Unique username..."
                            maxLength={18}
                          />
                          <button
                            onClick={handleSaveUsername}
                            disabled={usernameSaving}
                            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold cursor-pointer"
                          >
                            {usernameSaving ? 'Checking...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUsername(false);
                              setUsernameError(null);
                            }}
                            className="px-2 py-1 rounded-xl bg-neutral-800 text-neutral-400 text-xs font-mono cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        {usernameError && (
                          <div className="text-[11px] font-mono text-rose-400 mt-1">
                            {usernameError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <h3 className="text-2xl font-bold font-['Patrick_Hand'] text-white leading-none">
                          {currentProfile.username}
                        </h3>
                        {isMisioriUser(currentProfile.username, currentProfile.email) && (
                          <span className="inline-flex items-center justify-center self-center" title="Verified @misiori">
                            <CheckCircle2 className="w-4 h-4 fill-sky-400 text-neutral-950 inline-block drop-shadow shrink-0" />
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setNewUsername(currentProfile.username);
                            setUsernameError(null);
                            setEditingUsername(true);
                          }}
                          className="p-1 rounded-lg text-neutral-500 hover:text-blue-400 transition-colors cursor-pointer"
                          title="Edit Username"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Avatar Upload / Remove Actions */}
                    <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start">
                      <label className="text-[11px] font-mono text-neutral-400 hover:text-white underline cursor-pointer flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {currentProfile.avatar_url ? 'change avatar' : 'upload avatar'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                      {currentProfile.avatar_url && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="text-[11px] font-mono text-neutral-400 hover:text-rose-400 underline cursor-pointer flex items-center gap-0.5 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          remove avatar
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoggedIn ? (
                    <button
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-xs transition-all cursor-pointer self-center sm:self-start"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      sign out
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-['Patrick_Hand'] bg-neutral-900 text-neutral-400 border border-neutral-800 self-center sm:self-start lowercase">
                      guest
                    </span>
                  )}
                </div>

                {/* Stats Row: active skin, sugar, pts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-neutral-800/80">
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="text-[10px] font-['Patrick_Hand'] text-neutral-500 lowercase block">active skin</span>
                    <span className="text-xs font-['Patrick_Hand'] lowercase" style={{ color: activeSkin.color }}>
                      {activeSkin.name.toLowerCase()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="text-[10px] font-['Patrick_Hand'] text-neutral-500 lowercase block">sugar cubes</span>
                    <span className="text-xs font-['Patrick_Hand'] text-amber-400 flex items-center gap-1 lowercase">
                      <Cookie className="w-3.5 h-3.5" />
                      {currentProfile.sugar_cubes}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="text-[10px] font-['Patrick_Hand'] text-neutral-500 lowercase block">points</span>
                    <span className="text-xs font-['Patrick_Hand'] text-neutral-200 flex items-center gap-1 lowercase">
                      <Award className="w-3.5 h-3.5" />
                      {totalPts.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chambers section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-['Patrick_Hand'] text-base text-neutral-300 lowercase">
                  chambers beaten
                </div>
                <div className="font-['Patrick_Hand'] text-sm text-white font-bold lowercase">
                  quantity: {totalChambersBeaten}
                </div>
              </div>

              {/* Difficulty Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {statsByDiff.map((stat) => (
                  <div
                    key={stat.difficulty}
                    className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-['Patrick_Hand'] lowercase" style={{ color: stat.color }}>
                        {stat.difficulty.toLowerCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-['Patrick_Hand'] text-white font-bold">
                        {stat.beaten}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* View created chambers button */}
              <button
                onClick={async () => {
                  sound.playClick();
                  setViewingPlayerLevels({
                    username: currentProfile.username,
                    levels: [],
                    loading: true,
                  });
                  const lvls = await fetchLevelsByCreator(currentProfile.username);
                  setViewingPlayerLevels({
                    username: currentProfile.username,
                    levels: lvls,
                    loading: false,
                  });
                }}
                className="w-full mt-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-sm lowercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>view ur published chambers</span>
              </button>
            </div>

            {/* Sign in / Sign Up Form for Guests */}
            {!isLoggedIn && (
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                  <span className="font-['Patrick_Hand'] text-base text-white lowercase">
                    {authMode === 'signin' ? 'sign in' : 'create account'}
                  </span>

                  <div className="flex items-center gap-1 font-['Patrick_Hand'] text-sm lowercase">
                    <button
                      onClick={() => {
                        setAuthMode('signin');
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg ${
                        authMode === 'signin' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500'
                      }`}
                    >
                      sign in
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg ${
                        authMode === 'signup' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500'
                      }`}
                    >
                      sign up
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 text-xs font-mono flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="mb-3 p-2.5 rounded-xl bg-green-950/60 border border-green-800/80 text-green-400 text-xs font-mono flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-['Patrick_Hand'] text-neutral-400 mb-1 lowercase">
                      {authMode === 'signin' ? 'username or email' : 'username'}
                    </label>
                    <input
                      type="text"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder={authMode === 'signin' ? 'enter username or email' : 'choose a username'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-neutral-400 font-mono"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-['Patrick_Hand'] text-neutral-400 mb-1 lowercase">
                        email address
                      </label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold font-mono text-sm tracking-wider shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : authMode === 'signin' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        SIGN IN
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        CREATE ACCOUNT
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Leaderboard by PTS */}
        {tab === 'leaderboard' && (
          <div className="mt-5 space-y-3 overflow-y-auto pr-1">
            {viewedPlayer ? (
              renderViewedPlayerCard()
            ) : (
              <>
                <div className="flex items-center justify-between text-base font-['Patrick_Hand'] text-neutral-400 px-2 lowercase">
                  <span>rank & player</span>
                  <span>total pts</span>
                </div>

                {loadingLeaderboard && (
                  <div className="text-center py-8 text-neutral-500 text-sm font-['Patrick_Hand'] lowercase">
                    calculating global rankings...
                  </div>
                )}

                {!loadingLeaderboard && leaderboard.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-sm font-['Patrick_Hand'] lowercase">
                    no scores recorded yet. beat levels to claim #1 rank!
                  </div>
                )}

                {leaderboard.map((player, idx) => {
                  const isCurrent = player.id === currentProfile.id;
                  const rank = idx + 1;

                  return (
                    <div
                      key={player.id || idx}
                      onClick={() => {
                        sound.playClick();
                        setShowSkinInViewedProfile(false);
                        setViewedPlayer(player);
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer hover:bg-neutral-800/60 hover:border-neutral-700 ${
                        isCurrent
                          ? 'bg-neutral-900/90 border-neutral-700'
                          : 'bg-neutral-950/60 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge in handwritten font */}
                        <div className="w-7 text-center font-bold font-['Patrick_Hand'] text-base">
                          {rank === 1 ? (
                            <span className="text-amber-400">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-neutral-300">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-amber-600">🥉</span>
                          ) : (
                            <span className="text-neutral-500">#{rank}</span>
                          )}
                        </div>

                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt="Avatar"
                            className="w-9 h-9 rounded-xl object-cover border border-neutral-700"
                          />
                        ) : (
                          <SkinRenderer skinId={player.active_skin} size={36} />
                        )}

                        <div>
                          <div className="font-bold text-base font-['Patrick_Hand'] text-white flex items-center gap-1.5">
                            <span className="leading-none">{player.username}</span>
                            {isMisioriUser(player.username, player.email) && (
                              <span className="inline-flex items-center justify-center self-center" title="Verified @misiori">
                                <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-neutral-950 inline-block shrink-0" />
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] font-['Patrick_Hand'] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 leading-none lowercase">
                                you
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold font-['Patrick_Hand'] text-neutral-200">
                          {player.total_pts.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Search Players (NO EMAIL SHOWN) */}
        {tab === 'search' && (
          <div className="mt-5 space-y-4 overflow-y-auto pr-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search players by username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-base focus:outline-none focus:border-neutral-500 font-['Patrick_Hand']"
              />
            </div>

            {viewedPlayer && renderViewedPlayerCard()}

            {!viewedPlayer && (
              <div className="space-y-2">
                {searching && (
                  <div className="text-center py-6 text-sm font-['Patrick_Hand'] text-neutral-500 lowercase">
                    searching colony archives...
                  </div>
                )}

                {!searching && searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-sm font-['Patrick_Hand'] lowercase">
                    no players found matching "{searchQuery}".
                  </div>
                )}

                {!searching && !searchQuery && (
                  <div className="text-center py-8 text-neutral-500 text-sm font-['Patrick_Hand'] lowercase">
                    type a player's username above to view their avatar and chamber progress.
                  </div>
                )}

                {searchResults.map((player) => {
                  const playerPts =
                    Object.values(player.high_scores || {}).reduce(
                      (a, b) => a + (Number(b) || 0),
                      0
                    ) + (player.bonus_pts || 0);
                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        sound.playClick();
                        setShowSkinInViewedProfile(false);
                        setViewedPlayer(player);
                      }}
                      className="p-3 rounded-2xl bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt="Avatar"
                            className="w-10 h-10 rounded-xl object-cover border border-neutral-700"
                          />
                        ) : (
                          <SkinRenderer skinId={player.active_skin} size={38} />
                        )}
                        <div>
                          <div className="font-bold text-base font-['Patrick_Hand'] text-white flex items-center gap-1.5">
                            <span className="leading-none">{player.username}</span>
                            {isMisioriUser(player.username, player.email) && (
                              <span className="inline-flex items-center justify-center self-center" title="Verified @misiori">
                                <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-neutral-950 inline-block shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-lg font-bold font-['Patrick_Hand'] text-neutral-200">
                        {playerPts.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </motion.div>
    </div>
  );
};
