import { DailyChallenge, DailyChallengeProgress, PlayerProfile, ChallengeType } from '../types/game';
import { DAILY_CHALLENGES } from './constants';

export const getTodayKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTimeUntilMidnight = (): { hours: number; minutes: number; seconds: number; formatted: string } => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return { hours, minutes, seconds, formatted };
};

export const ensureDailyChallengeProgress = (profile: PlayerProfile): DailyChallengeProgress => {
  const today = getTodayKey();
  const current = profile.daily_challenges;

  if (current && current.date === today) {
    return current;
  }

  // New day or first initialization
  return {
    date: today,
    progress: {},
    completed: {},
    claimed: {},
  };
};

export interface ChallengeEvent {
  type: ChallengeType;
  count?: number;
  value?: number;
  difficulty?: string;
}

export interface RecordEventResult {
  updatedProfile: PlayerProfile;
  newlyCompleted: DailyChallenge[];
}

export const recordChallengeEvent = (
  profile: PlayerProfile,
  event: ChallengeEvent
): RecordEventResult => {
  const today = getTodayKey();
  const currentProg = ensureDailyChallengeProgress(profile);

  const newProgress: Record<string, number> = { ...currentProg.progress };
  const newCompleted: Record<string, boolean> = { ...currentProg.completed };
  const newlyCompleted: DailyChallenge[] = [];

  DAILY_CHALLENGES.forEach((challenge) => {
    let qualifies = false;
    let increment = 0;

    switch (challenge.type) {
      case 'dodge_ants':
        if (event.type === 'dodge_ants') {
          qualifies = true;
          increment = event.count || 1;
        }
        break;
      case 'collect_sugar':
        if (event.type === 'collect_sugar') {
          qualifies = true;
          increment = event.count || 1;
        }
        break;
      case 'speed_portals':
        if (event.type === 'speed_portals') {
          qualifies = true;
          increment = event.count || 1;
        }
        break;
      case 'beat_hard':
        if (
          event.type === 'beat_hard' &&
          (event.difficulty === 'Hard' ||
            event.difficulty === 'Harder' ||
            event.difficulty === 'Insane' ||
            event.difficulty === 'Crazy')
        ) {
          qualifies = true;
          increment = 1;
        }
        break;
      case 'survive_free_mode':
        if (event.type === 'survive_free_mode') {
          qualifies = true;
          // For survival time, we take the max reached
          const currentVal = newProgress[challenge.id] || 0;
          const newVal = Math.max(currentVal, event.value || 0);
          newProgress[challenge.id] = newVal;
          if (newVal >= challenge.targetCount && !newCompleted[challenge.id]) {
            newCompleted[challenge.id] = true;
            newlyCompleted.push(challenge);
          }
          return;
        }
        break;
      case 'score_milestone':
        if (event.type === 'score_milestone') {
          qualifies = true;
          const currentVal = newProgress[challenge.id] || 0;
          const newVal = Math.max(currentVal, event.value || 0);
          newProgress[challenge.id] = newVal;
          if (newVal >= challenge.targetCount && !newCompleted[challenge.id]) {
            newCompleted[challenge.id] = true;
            newlyCompleted.push(challenge);
          }
          return;
        }
        break;
    }

    if (qualifies && increment > 0) {
      const prev = newProgress[challenge.id] || 0;
      const updated = prev + increment;
      newProgress[challenge.id] = updated;

      if (updated >= challenge.targetCount && !newCompleted[challenge.id]) {
        newCompleted[challenge.id] = true;
        newlyCompleted.push(challenge);
      }
    }
  });

  const updatedDaily: DailyChallengeProgress = {
    date: today,
    progress: newProgress,
    completed: newCompleted,
    claimed: currentProg.claimed || {},
  };

  return {
    updatedProfile: {
      ...profile,
      daily_challenges: updatedDaily,
    },
    newlyCompleted,
  };
};

export const claimChallengeReward = (
  profile: PlayerProfile,
  challengeId: string
): PlayerProfile => {
  const challenge = DAILY_CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) return profile;

  const currentProg = ensureDailyChallengeProgress(profile);
  if (!currentProg.completed[challengeId] || currentProg.claimed[challengeId]) {
    return profile;
  }

  const updatedClaimed = {
    ...currentProg.claimed,
    [challengeId]: true,
  };

  const currentBonusPts = profile.bonus_pts || 0;
  const newBonusPts = currentBonusPts + challenge.rewardPts;

  // Also sync to high_scores under 'daily_bonus' so Supabase leaderboard & total_pts sum effortlessly
  const updatedHighScores = {
    ...profile.high_scores,
    daily_bonus: newBonusPts,
  };

  return {
    ...profile,
    bonus_pts: newBonusPts,
    sugar_cubes: profile.sugar_cubes + challenge.rewardSugar,
    high_scores: updatedHighScores,
    daily_challenges: {
      ...currentProg,
      claimed: updatedClaimed,
    },
  };
};

export const getClaimableCount = (profile: PlayerProfile): number => {
  const prog = ensureDailyChallengeProgress(profile);
  return DAILY_CHALLENGES.filter(
    (c) => prog.completed[c.id] && !prog.claimed[c.id]
  ).length;
};
