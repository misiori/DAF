import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IntroScreen } from './components/IntroScreen';
import { MainMenu } from './components/MainMenu';
import { LevelSelect } from './components/LevelSelect';
import { GameCanvas } from './components/GameCanvas';
import { SkinsModal } from './components/SkinsModal';
import { ShopModal } from './components/ShopModal';
import { ProfileModal } from './components/ProfileModal';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { OrientationGuard } from './components/OrientationGuard';
import { PlayerProfile, LevelConfig } from './types/game';
import { ChallengeEvent, recordChallengeEvent } from './lib/dailyChallenges';
import {
  getGuestProfile,
  saveGuestProfile,
  supabase,
  fetchProfileById,
  updateProfile,
} from './lib/supabase';
import { sound } from './lib/audio';

type ViewMode = 'intro' | 'menu' | 'level_select' | 'game';

export default function App() {
  const [view, setView] = useState<ViewMode>('intro');
  const [profile, setProfile] = useState<PlayerProfile>(getGuestProfile);
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null);

  // Modals
  const [showShop, setShowShop] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Start or stop menu BGM based on view
  useEffect(() => {
    if (view === 'menu' || view === 'level_select') {
      sound.startMenuBgm();
    } else {
      sound.stopMenuBgm();
    }
  }, [view]);

  // First interaction listener to allow Web Audio on user gesture
  useEffect(() => {
    const handleFirstClick = () => {
      sound.init();
      if (view === 'menu' || view === 'level_select') {
        sound.startMenuBgm();
      }
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);
    return () => {
      window.removeEventListener('click', handleFirstClick);
    };
  }, [view]);
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileById(session.user.id).then((p) => {
          if (p) {
            setProfile(p);
          }
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const p = await fetchProfileById(session.user.id);
        if (p) {
          setProfile(p);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update profile in state and persistence (Supabase + LocalStorage)
  const handleUpdateProfile = (updated: PlayerProfile) => {
    setProfile(updated);
    saveGuestProfile(updated);
    if (updated.id !== 'guest' && !updated.id.startsWith('guest_')) {
      updateProfile(updated.id, {
        active_skin: updated.active_skin,
        unlocked_skins: updated.unlocked_skins,
        sugar_cubes: updated.sugar_cubes,
        high_scores: updated.high_scores,
        beaten_levels: updated.beaten_levels,
        avatar_url: updated.avatar_url,
      });
    }
  };

  const handleSelectSkin = (skinId: string) => {
    const updated: PlayerProfile = {
      ...profile,
      active_skin: skinId,
    };
    handleUpdateProfile(updated);
  };

  const handleUnlockSkin = (skinId: string, cost: number) => {
    if (profile.sugar_cubes >= cost && !profile.unlocked_skins.includes(skinId)) {
      const updated: PlayerProfile = {
        ...profile,
        sugar_cubes: profile.sugar_cubes - cost,
        unlocked_skins: [...profile.unlocked_skins, skinId],
        active_skin: skinId,
      };
      handleUpdateProfile(updated);
    }
  };

  const handleGameOver = (finalScore: number, sugarEarned: number) => {
    if (!selectedLevel) return;
    const currentHigh = profile.high_scores[selectedLevel.id] || 0;
    const newHigh = Math.max(currentHigh, finalScore);

    // Note: level is NOT added to beaten_levels on Game Over (only 100% complete completion till the end counts!)
    const updated: PlayerProfile = {
      ...profile,
      sugar_cubes: profile.sugar_cubes + sugarEarned,
      high_scores: {
        ...profile.high_scores,
        [selectedLevel.id]: newHigh,
      },
    };
    handleUpdateProfile(updated);
  };

  const handleVictory = (finalScore: number, sugarEarned: number) => {
    if (!selectedLevel) return;
    const currentHigh = profile.high_scores[selectedLevel.id] || 0;
    const newHigh = Math.max(currentHigh, finalScore);
    const victoryBonus = 25;

    // Level beaten 100% till the end! Add to beaten_levels
    const currentBeaten = new Set(profile.beaten_levels || []);
    if (!selectedLevel.isEndless) {
      currentBeaten.add(selectedLevel.id);
    }

    const updated: PlayerProfile = {
      ...profile,
      sugar_cubes: profile.sugar_cubes + sugarEarned + victoryBonus,
      high_scores: {
        ...profile.high_scores,
        [selectedLevel.id]: newHigh,
      },
      beaten_levels: Array.from(currentBeaten),
    };
    handleUpdateProfile(updated);
  };

  const handleDailyChallengeProgress = (event: ChallengeEvent) => {
    const { updatedProfile } = recordChallengeEvent(profile, event);
    handleUpdateProfile(updatedProfile);
  };

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
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
            className="w-full h-full"
          >
            <MainMenu
              profile={profile}
              onPlayClick={() => setView('level_select')}
              onOpenShop={() => setShowShop(true)}
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
            className="w-full h-full"
          >
            <LevelSelect
              profile={profile}
              onSelectLevel={(lvl) => {
                setSelectedLevel(lvl);
                setView('game');
              }}
              onBack={() => setView('menu')}
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
        {showShop && <ShopModal onClose={() => setShowShop(false)} />}

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
            onProfileUpdated={handleUpdateProfile}
            onClose={() => setShowProfile(false)}
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
