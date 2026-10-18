/**
 * Level Attempts Tracker
 * Tracks how many times a player has entered or attempted a level (both official and custom).
 */

const ATTEMPTS_STORAGE_KEY = 'ant_farm_level_attempts';

export function getLevelAttempts(levelId: string | number, fallbackId?: string | number): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    const countA = Number(map[String(levelId)] || 0);
    if (countA > 0) return countA;
    if (fallbackId !== undefined) {
      return Number(map[String(fallbackId)] || 0);
    }
    return 0;
  } catch {
    return 0;
  }
}

export function incrementLevelAttempts(levelId: string | number, altId?: string | number): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = String(levelId);
    const next = (Number(map[key]) || 0) + 1;
    map[key] = next;
    if (altId && String(altId) !== key) {
      map[String(altId)] = (Number(map[String(altId)]) || 0) + 1;
    }
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(map));
    return next;
  } catch {
    return 1;
  }
}
