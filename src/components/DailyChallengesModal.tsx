import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Flame,
  Clock,
  CheckCircle2,
  Trophy,
  Cookie,
  Zap,
  ShieldAlert,
  Award,
  Sparkles,
  Gift,
} from 'lucide-react';
import { DAILY_CHALLENGES } from '../lib/constants';
import { PlayerProfile, DailyChallenge } from '../types/game';
import {
  ensureDailyChallengeProgress,
  getTimeUntilMidnight,
  claimChallengeReward,
} from '../lib/dailyChallenges';
import { sound } from '../lib/audio';

interface DailyChallengesModalProps {
  profile: PlayerProfile;
  onProfileUpdated: (updated: PlayerProfile) => void;
  onClose: () => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  profile,
  onProfileUpdated,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight().formatted);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dailyProg = ensureDailyChallengeProgress(profile);

  const handleClaim = (challenge: DailyChallenge) => {
    sound.playVictory();
    setClaimingId(challenge.id);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8', '#ffffff'],
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      const updated = claimChallengeReward(profile, challenge.id);
      onProfileUpdated(updated);
      setClaimingId(null);
    }, 400);
  };

  const getChallengeIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-blue-400" />;
      case 'Cookie':
        return <Cookie className="w-5 h-5 text-amber-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-400" />;
      default:
        return <Award className="w-5 h-5 text-purple-400" />;
    }
  };

  const totalPossiblePts = DAILY_CHALLENGES.reduce((a, b) => a + b.rewardPts, 0);
  const completedCount = DAILY_CHALLENGES.filter((c) => dailyProg.completed[c.id]).length;
  const claimedCount = DAILY_CHALLENGES.filter((c) => dailyProg.claimed[c.id]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-neutral-900 border border-blue-600/50 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-950/80 border border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <Flame className="w-6 h-6 fill-blue-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black font-['Russo_One'] tracking-wide text-white">
                  DAILY CHALLENGES
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-700">
                  +{totalPossiblePts.toLocaleString()} PTS DAILY
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400">
                Complete daily objectives to earn massive 1,000+ extra PTS and sugar cubes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/90 border border-blue-800/60 rounded-xl text-blue-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Resets in: <strong className="text-white">{timeLeft}</strong></span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Completed</span>
            <span className="text-lg font-black font-mono text-white">
              {completedCount} / {DAILY_CHALLENGES.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Rewards Claimed</span>
            <span className="text-lg font-black font-mono text-green-400">
              {claimedCount} / {DAILY_CHALLENGES.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Total Bonus PTS</span>
            <span className="text-lg font-black font-mono text-blue-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-blue-400" />
              +{(profile.bonus_pts || 0).toLocaleString()} PTS
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Colony Sugar</span>
            <span className="text-lg font-black font-mono text-amber-300 flex items-center gap-1">
              <Cookie className="w-4 h-4 text-amber-400" />
              {profile.sugar_cubes} Sugar
            </span>
          </div>
        </div>

        {/* Challenges List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 my-1">
          {DAILY_CHALLENGES.map((challenge) => {
            const currentCount = dailyProg.progress[challenge.id] || 0;
            const isCompleted = dailyProg.completed[challenge.id] || currentCount >= challenge.targetCount;
            const isClaimed = dailyProg.claimed[challenge.id];
            const percent = Math.min(100, Math.round((currentCount / challenge.targetCount) * 100));

            return (
              <div
                key={challenge.id}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
                  isClaimed
                    ? 'bg-neutral-950/40 border-neutral-800/60 opacity-75'
                    : isCompleted
                    ? 'bg-blue-950/30 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0 mt-0.5">
                    {getChallengeIcon(challenge.iconName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-['Russo_One'] text-base text-white tracking-wide">
                        {challenge.title}
                      </h4>
                      {isClaimed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-950 text-green-400 border border-green-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          CLAIMED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300 font-sans mt-0.5 leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2.5 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                        <span>Progress: {Math.min(currentCount, challenge.targetCount)} / {challenge.targetCount}</span>
                        <span className="font-bold text-blue-400">{percent}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2 rounded-full border border-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-blue-500 to-green-400'
                              : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Rewards & Claim Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-black font-mono text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-800">
                      <Sparkles className="w-3.5 h-3.5" />
                      +{challenge.rewardPts.toLocaleString()} PTS
                    </div>
                    <div className="text-[11px] font-mono text-amber-400 mt-0.5 flex items-center sm:justify-end gap-1">
                      <Cookie className="w-3 h-3" />
                      +{challenge.rewardSugar} Sugar
                    </div>
                  </div>

                  <div>
                    {isClaimed ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-500 font-mono text-xs font-bold border border-neutral-800 cursor-not-allowed flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        DONE
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaim(challenge)}
                        disabled={claimingId === challenge.id}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-black font-['Russo_One'] text-xs tracking-wider shadow-[0_0_20px_rgba(59,130,246,0.6)] cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
                      >
                        <Gift className="w-4 h-4 fill-current" />
                        CLAIM REWARD
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-500 font-mono text-xs font-bold border border-neutral-800 cursor-not-allowed"
                      >
                        IN PROGRESS
                      </button>
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
