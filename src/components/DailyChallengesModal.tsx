import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  X,
  Clock,
  Sparkles,
  Cookie,
  Target,
  Zap,
  Shield,
  Trophy,
} from 'lucide-react';
import { PlayerProfile, DailyChallenge } from '../types/game';
import { DAILY_CHALLENGES } from '../lib/constants';
import {
  ensureDailyChallengeProgress,
  claimChallengeReward,
  getTimeUntilMidnight,
} from '../lib/dailyChallenges';
import { sound } from '../lib/audio';
import confetti from 'canvas-confetti';

interface DailyChallengesModalProps {
  profile: PlayerProfile;
  onProfileUpdated: (profile: PlayerProfile) => void;
  onClose: () => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  profile,
  onProfileUpdated,
  onClose,
}) => {
  const [dailyProg, setDailyProg] = useState(() => ensureDailyChallengeProgress(profile));
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilMidnight().formatted);

  useEffect(() => {
    setDailyProg(ensureDailyChallengeProgress(profile));
  }, [profile]);

  // Live countdown to midnight UTC
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleClaim = (challenge: DailyChallenge) => {
    sound.playVictory();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    const updatedProfile = claimChallengeReward(profile, challenge.id);
    onProfileUpdated(updatedProfile);
  };

  const getChallengeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'Target':
        return <Target className="w-5 h-5 text-cyan-400" />;
      case 'Cookie':
        return <Cookie className="w-5 h-5 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-300" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  const completedCount = DAILY_CHALLENGES.filter((c: DailyChallenge) => dailyProg.completed[c.id]).length;
  const claimedCount = DAILY_CHALLENGES.filter((c: DailyChallenge) => dailyProg.claimed[c.id]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Caveat'] tracking-wide text-neutral-100 lowercase">
              challenges
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-full text-neutral-400 font-['Patrick_Hand'] text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>resets in: {timeLeft}</span>
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
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 my-3 text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
          <span>completed: {completedCount} / {DAILY_CHALLENGES.length}</span>
          <span>•</span>
          <span>claimed: {claimedCount} / {DAILY_CHALLENGES.length}</span>
        </div>

        {/* Challenges List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2">
          {DAILY_CHALLENGES.map((challenge: DailyChallenge) => {
            const currentCount = dailyProg.progress[challenge.id] || 0;
            const isCompleted = dailyProg.completed[challenge.id];
            const isClaimed = dailyProg.claimed[challenge.id];
            const percent = Math.min(100, Math.round((currentCount / challenge.targetCount) * 100));

            return (
              <div
                key={challenge.id}
                className={`p-3 sm:p-3.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                  isClaimed
                    ? 'bg-neutral-950/40 border-neutral-800/50 opacity-60'
                    : isCompleted
                    ? 'bg-neutral-900 border-neutral-600'
                    : 'bg-neutral-950/70 border-neutral-800/80'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0">
                    {getChallengeIcon(challenge.iconName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-['Caveat'] text-2xl font-bold text-neutral-100 lowercase">
                        {challenge.title.toLowerCase()}
                      </h4>
                      {isClaimed && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-['Patrick_Hand'] bg-neutral-800 text-neutral-400">
                          claimed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-['Patrick_Hand'] text-neutral-400 mt-1">
                      <span>{Math.min(currentCount, challenge.targetCount)} / {challenge.targetCount}</span>
                      <div className="w-24 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-300 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Rewards & Claim Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right text-xs font-['Patrick_Hand'] text-neutral-400 lowercase">
                    <div>+{challenge.rewardPts} pts</div>
                    <div>+{challenge.rewardSugar} sugar</div>
                  </div>

                  <div>
                    {isClaimed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-['Patrick_Hand'] text-neutral-500">
                        done
                      </span>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaim(challenge)}
                        className="px-3 py-1 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                      >
                        claim
                      </button>
                    ) : (
                      <span className="px-3 py-1 text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
                        in progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
