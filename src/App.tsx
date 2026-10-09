import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IntroScreen } from './components/IntroScreen';
import { MainMenu } from './components/MainMenu';
import { ChambersMenu, ChambersSubView } from './components/ChambersMenu';
import { GameCanvas } from './components/GameCanvas';
import { SkinsModal } from './components/SkinsModal';
import { ProfileModal } from './components/ProfileModal';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { OrientationGuard } from './components/OrientationGuard';
import { PlayerProfile, LevelConfig } from './types/game';
import { ChallengeEvent, recordChallengeEvent } from './lib/dailyChallenges';
import { customLevelToLevelConfig, clearDeviceCustomLevels, isLevelRated, saveDraftLevel, saveLastEditingLevel } from './lib/customLevels';
import {
  getGuestProfile,
  saveGuestProfile,
  supabase,
  fetchProfileById,
  updateProfile,
  mergeProfiles,
} from './lib/supabase';
import { sound } from './lib/audio';

type ViewMode = 'intro' | 'menu' | 'level_select' | 'game';

export default function App() {
  const [view, setView] = useState<ViewMode>('intro');
  const [profile, setProfile] = useState<PlayerProfile>(getGuestProfile);
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null);
  const selectedLevelRef = useRef<LevelConfig | null>(null);
  useEffect(() => {
    selectedLevelRef.current = selectedLevel;
  }, [selectedLevel]);
  const [chambersSubView, setChambersSubView] = useState<ChambersSubView>('menu');

  // Modals
  const [showSkins, setShowSkins] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTargetUsername, setProfileTargetUsername] = useState<string | undefined>(undefined);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Timestamp references to avoid timer resets on rerender
  const gameStartTimestampRef = React.useRef<number>(Date.now());
  const menuStartTimestampRef = React.useRef<number>(Date.now());

  // === DISCORD RICH PRESENCE ===
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const api = (window as any).electronAPI;
    if (!api || typeof api.updateDiscordPresence !== 'function') return;

    const inMenu = view === 'intro' || view === 'menu' || view === 'level_select';

    if (inMenu) {
      api.updateDiscordPresence({
        details: 'Idle',
        state: 'in the menu',
        startTimestamp: menuStartTimestampRef.current,
        largeImageKey: 'logo',
        largeImageText: 'Dangerous Ant Farm',
      });
    } else if (view === 'game' && selectedLevel) {
      api.updateDiscordPresence({
        details: `Playing: ${selectedLevel.name}`,
        state: `${selectedLevel.difficulty} • ${selectedLevel.isEndless ? 'free mode' : `#${selectedLevel.id}`}`,
        startTimestamp: gameStartTimestampRef.current,
        largeImageKey: 'logo',
        largeImageText: 'Dangerous Ant Farm',
      });
    }
  }, [view, selectedLevel]);

  // Start or stop menu BGM based on view
  useEffect(() => {
    if (view === 'menu' || view === 'level_select') {
      sound.startMenuBgm();
    } else {
      sound.stopMenuBgm();
    }
  }, [view]);

  // First interaction listener to allow Web Audio on user gesture (crucial for iOS Safari / iPhone 7 & tablets)
  useEffect(() => {
    const handleFirstGesture = () => {
      sound.unlockAudio();
      if (view === 'menu' || view === 'level_select') {
        sound.startMenuBgm();
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
  }, [view]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileById(session.user.id).then((cloud) => {
          if (cloud) {
            setProfile(cloud);
          }
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem('ant_farm_guest_profile_v2');
        localStorage.removeItem('ant_farm_guest_profile');
        clearDeviceCustomLevels();
        const freshGuest: PlayerProfile = {
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
        setProfile(freshGuest);
        return;
      }
      if (session?.user) {
        const cloud = await fetchProfileById(session.user.id);
        if (cloud) {
          setProfile(cloud);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update profile in state and persistence (Supabase + LocalStorage)
  const handleUpdateProfile = (updated: PlayerProfile) => {
    setProfile((prevProfile) => {
      const merged: PlayerProfile = {
        ...prevProfile,
        ...updated,
        sugar_cubes: updated.sugar_cubes ?? prevProfile.sugar_cubes,
        active_skin: updated.active_skin || prevProfile.active_skin,
        unlocked_skins: Array.from(new Set([...(prevProfile.unlocked_skins || ['amber']), ...(updated.unlocked_skins || ['amber'])])),
        beaten_levels: Array.from(
          new Set([
            ...(prevProfile.beaten_levels || []).map(Number),
            ...(updated.beaten_levels || []).map(Number),
          ])
        ),
        high_scores: {
          ...(prevProfile.high_scores || {}),
          ...(updated.high_scores || {}),
        },
        level_progress: {
          ...(prevProfile.level_progress || {}),
          ...(updated.level_progress || {}),
        },
      };

      saveGuestProfile(merged);
      if (merged.id !== 'guest' && !merged.id.startsWith('guest_')) {
        updateProfile(merged.id, merged);
      }
      return merged;
    });
  };

  const handleSelectSkin = (skinId: string) => {
    setProfile((prev) => {
      const updated: PlayerProfile = {
        ...prev,
        active_skin: skinId,
      };
      saveGuestProfile(updated);
      if (updated.id !== 'guest' && !updated.id.startsWith('guest_')) {
        updateProfile(updated.id, { active_skin: skinId });
      }
      return updated;
    });
  };

  const handleUnlockSkin = (skinId: string, cost: number) => {
    setProfile((prev) => {
      if (prev.sugar_cubes >= cost && !prev.unlocked_skins.includes(skinId)) {
        const updated: PlayerProfile = {
          ...prev,
          sugar_cubes: prev.sugar_cubes - cost,
          unlocked_skins: [...prev.unlocked_skins, skinId],
          active_skin: skinId,
        };
        saveGuestProfile(updated);
        if (updated.id !== 'guest' && !updated.id.startsWith('guest_')) {
          updateProfile(updated.id, {
            sugar_cubes: updated.sugar_cubes,
            unlocked_skins: updated.unlocked_skins,
            active_skin: updated.active_skin,
          });
        }
        return updated;
      }
      return prev;
    });
  };

  // === GAME OVER (loss or manual exit) ===
  // IMPORTANT: this NEVER marks a level as beaten and NEVER writes 100% progress.
  // Only onVictory is allowed to do that. Progress is clamped to 99% max.
  // Sugar and high score points are ONLY added if the level is rated.
  const handleGameOver = useCallback(
    (lvlId: number, finalScore: number, sugarEarned: number, progressPercent = 0, isEndless = false) => {
      const idNum = Number(lvlId);
      const curLevel = selectedLevelRef.current;
      const isRated = isLevelRated(curLevel);

      setProfile((prevProfile) => {
        const currentHigh =
          prevProfile.high_scores?.[idNum] ??
          prevProfile.high_scores?.[String(idNum)] ??
          0;
        const newHigh = Math.max(Number(currentHigh) || 0, finalScore);

        const prevProgress =
          prevProfile.level_progress?.[idNum] ??
          prevProfile.level_progress?.[String(idNum)] ??
          0;

        // Clamp to 99% — even if GameCanvas sends 100, we never store 100 from onGameOver.
        const clampedIncoming = Math.min(99, Math.round(progressPercent));
        const newProgress = Math.min(99, Math.max(Number(prevProgress) || 0, clampedIncoming));

        // beaten_levels is NOT touched here. Only onVictory adds to it.
        const beatenSet = new Set((prevProfile.beaten_levels || []).map(Number));

        const updatedProgress: Record<string | number, number> = {
          ...(prevProfile.level_progress || {}),
          [idNum]: newProgress,
          [String(idNum)]: newProgress,
        };

        const updatedHighScores: Record<string, number> = isRated
          ? {
              ...(prevProfile.high_scores || {}),
              [idNum]: newHigh,
              [String(idNum)]: newHigh,
            }
          : { ...(prevProfile.high_scores || {}) };

        let updated: PlayerProfile = {
          ...prevProfile,
          sugar_cubes: isRated ? (prevProfile.sugar_cubes || 0) + sugarEarned : (prevProfile.sugar_cubes || 0),
          high_scores: updatedHighScores,
          level_progress: updatedProgress,
          beaten_levels: Array.from(beatenSet),
        };

        if (isRated) {
          const r = recordChallengeEvent(updated, { type: 'score_milestone', value: finalScore });
          updated = r.updatedProfile;
        }

        saveGuestProfile(updated);
        if (updated.id !== 'guest' && !updated.id.startsWith('guest_')) {
          updateProfile(updated.id, {
            sugar_cubes: updated.sugar_cubes,
            high_scores: updated.high_scores,
            beaten_levels: updated.beaten_levels,
            level_progress: updated.level_progress,
            daily_challenges: updated.daily_challenges,
          });
        }
        return updated;
      });
    },
    []
  );

  // === VICTORY (real, no-noclip completion) ===
  // Only this function can set level_progress to 100 and add to beaten_levels.
  // Sugar and pts are ONLY added to account if the level is rated!
  // Beaten statistics are recorded for BOTH official and user levels.
  const handleVictory = useCallback(
    (lvlId: number, finalScore: number, sugarEarned: number, difficulty: string, isEndless = false) => {
      const idNum = Number(lvlId);
      const victoryBonus = 25;
      const curLevel = selectedLevelRef.current;
      const isRated = isLevelRated(curLevel);

      setProfile((prevProfile) => {
        const currentHigh =
          prevProfile.high_scores?.[idNum] ??
          prevProfile.high_scores?.[String(idNum)] ??
          0;
        const newHigh = Math.max(Number(currentHigh) || 0, finalScore);

        const beatenSet = new Set((prevProfile.beaten_levels || []).map(Number));
        if (!isEndless) {
          beatenSet.add(idNum);
        }

        const updatedProgress: Record<string | number, number> = {
          ...(prevProfile.level_progress || {}),
          [idNum]: 100,
          [String(idNum)]: 100,
        };

        const updatedHighScores: Record<string, number> = isRated
          ? {
              ...(prevProfile.high_scores || {}),
              [idNum]: newHigh,
              [String(idNum)]: newHigh,
            }
          : { ...(prevProfile.high_scores || {}) };

        const isCustom = Boolean((curLevel as any)?.customData || (curLevel as any)?.isCustom);
        const effectiveDiff = (curLevel as any)?.customData?.difficulty || difficulty || curLevel?.difficulty || 'Normal';
        const updatedBeatenDetails = {
          ...(prevProfile.beaten_level_details || {}),
          [idNum]: {
            difficulty: effectiveDiff,
            name: curLevel?.name || 'chamber',
            isCustom,
            isRated,
          },
          [String(idNum)]: {
            difficulty: effectiveDiff,
            name: curLevel?.name || 'chamber',
            isCustom,
            isRated,
          },
        };

        let updated: PlayerProfile = {
          ...prevProfile,
          sugar_cubes: isRated
            ? (prevProfile.sugar_cubes || 0) + sugarEarned + victoryBonus
            : (prevProfile.sugar_cubes || 0),
          high_scores: updatedHighScores,
          level_progress: updatedProgress,
          beaten_levels: Array.from(beatenSet),
          beaten_level_details: updatedBeatenDetails,
        };

        if (isRated) {
          const r1 = recordChallengeEvent(updated, { type: 'beat_hard', difficulty: difficulty as any });
          updated = r1.updatedProfile;
          const r2 = recordChallengeEvent(updated, { type: 'score_milestone', value: finalScore });
          updated = r2.updatedProfile;
        }

        saveGuestProfile(updated);
        if (updated.id !== 'guest' && !updated.id.startsWith('guest_')) {
          updateProfile(updated.id, {
            sugar_cubes: updated.sugar_cubes,
            high_scores: updated.high_scores,
            beaten_levels: updated.beaten_levels,
            level_progress: updated.level_progress,
            daily_challenges: updated.daily_challenges,
          });
        }

        // If this was a custom chamber editor verification test and won, mark verified
        if ((curLevel as any)?.isVerification && (curLevel as any)?.customData) {
          const verifiedDraft = {
            ...(curLevel as any).customData,
            verified: true,
          };
          saveDraftLevel(verifiedDraft, prevProfile);
          saveLastEditingLevel(verifiedDraft);
        }

        return updated;
      });
    },
    []
  );

  const handleDailyChallengeProgress = useCallback((event: ChallengeEvent) => {
    setProfile((prevProfile) => {
      const { updatedProfile } = recordChallengeEvent(prevProfile, event);
      saveGuestProfile(updatedProfile);
      if (updatedProfile.id !== 'guest' && !updatedProfile.id.startsWith('guest_')) {
        updateProfile(updatedProfile.id, { daily_challenges: updatedProfile.daily_challenges });
      }
      return updatedProfile;
    });
  }, []);

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-full max-w-full min-h-[100dvh] h-auto overflow-x-hidden overflow-y-auto bg-black font-sans select-none overscroll-none">
      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="w-full min-h-[100dvh]"
          >
            <IntroScreen onComplete={() => setView('menu')} />
          </motion.div>
        )}

        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="w-full min-h-[100dvh]"
          >
            <MainMenu
              profile={profile}
              onPlayClick={() => {
                setChambersSubView('menu');
                setView('level_select');
              }}
              onOpenSkins={() => setShowSkins(true)}
              onOpenProfile={() => setShowProfile(true)}
              onOpenDailyChallenges={() => setShowDailyChallenges(true)}
              isMuted={isMuted}
              onToggleMute={toggleMute}
            />
          </motion.div>
        )}

        {view === 'level_select' && (
          <motion.div
            key="level_select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35 }}
            className="w-full min-h-[100dvh]"
          >
            <ChambersMenu
              profile={profile}
              initialSubView={chambersSubView}
              onSubViewChange={(sub) => setChambersSubView(sub)}
              onSelectLevel={(lvl, section) => {
                setSelectedLevel(lvl);
                if (section) setChambersSubView(section);
                gameStartTimestampRef.current = Date.now();
                setView('game');
              }}
              onBack={() => {
                setChambersSubView('menu');
                setView('menu');
              }}
              onOpenProfile={(username) => {
                setProfileTargetUsername(username);
                setShowProfile(true);
              }}
            />
          </motion.div>
        )}

        {view === 'game' && selectedLevel && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <GameCanvas
              level={selectedLevel}
              profile={profile}
              onGameOver={handleGameOver}
              onVictory={handleVictory}
              onExit={() => setView('level_select')}
              onProgressDailyChallenge={handleDailyChallengeProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AnimatePresence>
        {showSkins && (
          <SkinsModal
            activeSkinId={profile.active_skin}
            unlockedSkinIds={profile.unlocked_skins || ['amber']}
            sugarCubes={profile.sugar_cubes}
            onSelectSkin={handleSelectSkin}
            onUnlockSkin={handleUnlockSkin}
            onClose={() => setShowSkins(false)}
          />
        )}

        {showProfile && (
          <ProfileModal
            currentProfile={profile}
            initialViewedUsername={profileTargetUsername}
            onProfileUpdated={handleUpdateProfile}
            onPlayCustomLevel={(customLvl) => {
              setShowProfile(false);
              setProfileTargetUsername(undefined);
              setSelectedLevel(customLevelToLevelConfig(customLvl));
              setChambersSubView('discover');
              gameStartTimestampRef.current = Date.now();
              setView('game');
            }}
            onClose={() => {
              setShowProfile(false);
              setProfileTargetUsername(undefined);
            }}
          />
        )}

        {showDailyChallenges && (
          <DailyChallengesModal
            profile={profile}
            onProfileUpdated={handleUpdateProfile}
            onClose={() => setShowDailyChallenges(false)}
          />
        )}
      </AnimatePresence>

      {/* Landscape Orientation Requirement on Mobile Phones */}
      <OrientationGuard />
    </div>
  );
}