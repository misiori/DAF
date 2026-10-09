import { LevelConfig, PlayerProfile, AntFormation, CustomPowerUpPlacement, CustomSpeedPortalPlacement } from '../types/game';
import { supabase, supabaseAdmin, isMisioriUser } from './supabase';

export interface CustomAnthillPlacement {
  id: number;
  xFrac: number; // 0.0 to 1.0 relative to play box
  yFrac: number; // 0.0 to 1.0 relative to play box
  type?: 'standard' | 'fire' | 'acid';
  hp?: number;
}

export interface CustomCocoonPlacement {
  id: number;
  xFrac: number;
  yFrac: number;
  hp?: number;
}

export interface PowerUpChances {
  speed: number;       // 0 to 100%
  honeyTraps: number;  // 0 to 100%
  nukeBomb: number;    // 0 to 100%
  freezeBomb: number;  // 0 to 100%
  speed05?: number;    // 0 to 100% for 0.5x speed portal
  speed10?: number;    // 0 to 100% for 1.0x speed portal
  speed15?: number;    // 0 to 100% for 1.5x speed portal
  speed20?: number;    // 0 to 100% for 2.0x speed portal
  formations?: AntFormation[];
  customPowerUps?: CustomPowerUpPlacement[];
  customSpeedPortals?: CustomSpeedPortalPlacement[];
  bgImage?: string;
  bgOpacity?: number;
  difficulty?: CustomLevelDifficulty;
  ratedByMisiori?: boolean;
}

export type CustomLevelDifficulty =
  | 'Unrated'
  | 'Easy'
  | 'Normal'
  | 'Hard'
  | 'Harder'
  | 'Insane'
  | 'Crazy';

export interface CustomLevel {
  id: string;
  name: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  themeColor: string;
  bgColor?: string;
  bgImage?: string;
  bgOpacity?: number;
  anthills: CustomAnthillPlacement[];
  cocoons: CustomCocoonPlacement[];
  bossCount: number;
  powerUpChances: PowerUpChances;
  durationSeconds: number;
  difficulty: CustomLevelDifficulty;
  verified: boolean;
  published: boolean;
  ratedByMisiori?: boolean;
  plays: number;
  formations?: AntFormation[];
  customPowerUps?: CustomPowerUpPlacement[];
  customSpeedPortals?: CustomSpeedPortalPlacement[];
  createdAt: string;
  updatedAt: string;
}

export const ALL_FORMATIONS: { id: AntFormation; label: string; desc: string; badge: string; diffTag: string }[] = [
  { id: 'direct', label: 'one direction', desc: 'straight charge at target', badge: 'easy', diffTag: 'easy' },
  { id: 'spiral', label: 'spiral', desc: 'swirling inward vortex', badge: 'normal', diffTag: 'normal' },
  { id: 'orbit', label: 'orbit', desc: 'swerving angular sweep', badge: 'hard', diffTag: 'hard' },
  { id: 'twin', label: 'twin', desc: 'mirrored flanking split', badge: 'insane', diffTag: 'insane' },
  { id: 'zigzag', label: 'zigzag', desc: 'rapid oscillating weave', badge: 'crazy', diffTag: 'crazy' },
];

/**
 * Difficulty-based ant movement direction rules:
 * - Easy: go in one direction (direct)
 * - Normal: spiral adds
 * - Hard: orbit adds
 * - Harder: the same as hard (direct, spiral, orbit)
 * - Insane: twin adds
 * - Crazy: orbit & all directions active
 */
export function getDifficultyFormations(difficulty: string): AntFormation[] {
  const d = (difficulty || '').toLowerCase();
  switch (d) {
    case 'easy':
      return ['direct'];
    case 'normal':
      return ['direct', 'spiral'];
    case 'hard':
      return ['direct', 'spiral', 'orbit'];
    case 'harder':
      return ['direct', 'spiral', 'orbit'];
    case 'insane':
      return ['direct', 'spiral', 'orbit', 'twin'];
    case 'crazy':
      return ['direct', 'spiral', 'orbit', 'twin', 'zigzag'];
    default:
      return ['direct'];
  }
}

const LOCAL_DRAFTS_KEY = 'daf_custom_levels_drafts_v1';
const LOCAL_SAVED_CHAMBERS_KEY = 'daf_saved_chambers_ids_v1';
const LOCAL_COMMUNITY_CACHE_KEY = 'daf_community_levels_cache_v1';
const LAST_EDITING_LEVEL_KEY = 'daf_last_editing_level_v1';

export function saveLastEditingLevel(level: CustomLevel): void {
  try {
    localStorage.setItem(LAST_EDITING_LEVEL_KEY, JSON.stringify(level));
  } catch (e) {
    console.warn('Error caching last editing level', e);
  }
}

export function getLastEditingLevel(): CustomLevel | null {
  try {
    const raw = localStorage.getItem(LAST_EDITING_LEVEL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading last editing level', e);
  }
  return null;
}

export function clearLastEditingLevel(): void {
  try {
    localStorage.removeItem(LAST_EDITING_LEVEL_KEY);
  } catch (_) {}
}

// Preset Theme Color Palettes
export const THEME_COLOR_PRESETS = [
  { name: 'cyan neon', color: '#38bdf8' },
  { name: 'toxic green', color: '#22c55e' },
  { name: 'amber gold', color: '#f59e0b' },
  { name: 'crimson fire', color: '#ef4444' },
  { name: 'royal purple', color: '#a855f7' },
  { name: 'hot pink', color: '#ec4899' },
  { name: 'emerald matrix', color: '#10b981' },
  { name: 'electric blue', color: '#3b82f6' },
  { name: 'mono white', color: '#f8fafc' },
];

// No mock/preview levels: only genuine database and user-created levels
export const SEED_COMMUNITY_LEVELS: CustomLevel[] = [];

/**
 * Mobile device detector to enforce PC-only building
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

/**
 * Consistent numeric ID for custom levels to store scores & progress
 */
export function getCustomLevelNumberId(customId: string): number {
  let numId = 100000;
  for (let i = 0; i < customId.length; i++) {
    numId = (numId * 31 + customId.charCodeAt(i)) % 900000 + 100000;
  }
  return numId;
}

export function getCustomLevelProgress(profile: PlayerProfile, lvl: CustomLevel): number {
  const numId = getCustomLevelNumberId(lvl.id);
  const beaten = (profile.beaten_levels || []).map(Number).includes(numId);
  if (beaten) return 100;
  const p1 = profile.level_progress?.[numId] ?? 0;
  const p2 = profile.level_progress?.[String(numId)] ?? 0;
  const p3 = profile.level_progress?.[lvl.id] ?? 0;
  const val = Math.max(Number(p1) || 0, Number(p2) || 0, Number(p3) || 0);
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function getCustomLevelHighScore(profile: PlayerProfile, lvl: CustomLevel): number {
  const numId = getCustomLevelNumberId(lvl.id);
  const s1 = profile.high_scores?.[numId] ?? 0;
  const s2 = profile.high_scores?.[String(numId)] ?? 0;
  const s3 = profile.high_scores?.[lvl.id] ?? 0;
  return Math.max(Number(s1) || 0, Number(s2) || 0, Number(s3) || 0);
}

/**
 * Get locally stored community levels cache
 */
export function getLocalCommunityCache(): CustomLevel[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMUNITY_CACHE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        // Filter out any leftover seed levels
        const clean = list.filter((l: any) => l && l.id && !String(l.id).startsWith('seed_'));
        return clean;
      }
    }
  } catch (e) {
    console.warn('Error reading community cache', e);
  }
  return [];
}

/**
 * Returns all known custom levels from cache, drafts, and saved chambers
 */
export function getAllKnownCustomLevels(): CustomLevel[] {
  const map = new Map<string, CustomLevel>();
  try {
    getLocalCommunityCache().forEach((lvl) => {
      if (lvl && lvl.id) map.set(lvl.id, lvl);
    });
    // Check saved chambers
    const rawSaved = localStorage.getItem(LOCAL_SAVED_CHAMBERS_KEY);
    if (rawSaved) {
      const ids: string[] = JSON.parse(rawSaved);
      if (Array.isArray(ids)) {
        // Cached entries
        ids.forEach((id) => {
          if (!map.has(id)) {
            const hit = getLocalCommunityCache().find((l) => l.id === id);
            if (hit) map.set(hit.id, hit);
          }
        });
      }
    }
    // Check user drafts
    const rawDrafts = localStorage.getItem('ant_draft_levels_v2');
    if (rawDrafts) {
      const drafts = JSON.parse(rawDrafts);
      if (Array.isArray(drafts)) {
        drafts.forEach((d: any) => {
          if (d && d.id && !map.has(d.id)) map.set(d.id, d);
        });
      }
    }
  } catch (e) {
    console.warn('getAllKnownCustomLevels error', e);
  }
  return Array.from(map.values());
}

/**
 * Save community levels cache
 */
function saveLocalCommunityCache(levels: CustomLevel[]) {
  try {
    localStorage.setItem(LOCAL_COMMUNITY_CACHE_KEY, JSON.stringify(levels));
  } catch (e) {
    console.warn('Error writing community cache', e);
  }
}

/**
 * Fetch all discover levels from Supabase + seed cache
 */
export async function fetchDiscoverLevels(
  searchQuery = '',
  difficultyFilter = 'all'
): Promise<CustomLevel[]> {
  let allLevels: CustomLevel[] = [...getLocalCommunityCache()];

  try {
    // 1. Try fetching from public.custom_levels table
    const { data, error } = await supabase
      .from('custom_levels')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const remoteLevels: CustomLevel[] = data.map((row: any) => ({
        id: String(row.id),
        name: row.name || 'unnamed chamber',
        creatorId: row.creator_id || row.creatorId || 'anon',
        creatorUsername: row.creator_username || row.creatorUsername || 'player',
        creatorAvatarUrl: row.creator_avatar_url || row.creatorAvatarUrl,
        themeColor: row.theme_color || row.themeColor || '#38bdf8',
        bgColor: row.bg_color || row.bgColor || '#090a0f',
        bgImage: row.bg_image || row.bgImage || row.power_up_chances?.bgImage,
        anthills: row.anthills || [],
        cocoons: row.cocoons || [],
        customPowerUps:
          (Array.isArray(row.custom_power_ups) && row.custom_power_ups.length > 0)
            ? row.custom_power_ups
            : (Array.isArray(row.customPowerUps) && row.customPowerUps.length > 0)
            ? row.customPowerUps
            : (Array.isArray(row.power_up_chances?.customPowerUps) ? row.power_up_chances.customPowerUps : []),
        customSpeedPortals:
          (Array.isArray(row.custom_speed_portals) && row.custom_speed_portals.length > 0)
            ? row.custom_speed_portals
            : (Array.isArray(row.customSpeedPortals) && row.customSpeedPortals.length > 0)
            ? row.customSpeedPortals
            : (Array.isArray(row.power_up_chances?.customSpeedPortals) ? row.power_up_chances.customSpeedPortals : []),
        bossCount: Number(row.boss_count ?? row.bossCount ?? 1),
        powerUpChances: row.power_up_chances || row.powerUpChances || {
          speed: 50,
          honeyTraps: 50,
          nukeBomb: 40,
          freezeBomb: 40,
        },
        durationSeconds: Number(row.duration_seconds ?? row.durationSeconds ?? 40),
        difficulty: row.difficulty || 'Unrated',
        verified: Boolean(row.verified || (row.difficulty && row.difficulty !== 'Unrated')),
        published: true,
        ratedByMisiori: Boolean(row.difficulty && row.difficulty !== 'Unrated'),
        plays: Number(row.plays || 0),
        formations:
          (Array.isArray(row.formations) && row.formations.length > 0 ? row.formations : null) ||
          (row.power_up_chances && Array.isArray(row.power_up_chances.formations) && row.power_up_chances.formations.length > 0 ? row.power_up_chances.formations : null) ||
          ['direct'],
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      }));

      // Merge remote with seeds without duplicate ids, preserving local rich data if any
      const map = new Map<string, CustomLevel>();
      const existingMap = new Map<string, CustomLevel>();
      allLevels.forEach((l) => existingMap.set(l.id, l));

      remoteLevels.forEach((l) => {
        const local = existingMap.get(l.id);
        const merged: CustomLevel = {
          ...l,
          bgImage: l.bgImage || local?.bgImage,
          customPowerUps:
            (l.customPowerUps && l.customPowerUps.length > 0) ? l.customPowerUps : (local?.customPowerUps || []),
          customSpeedPortals:
            (l.customSpeedPortals && l.customSpeedPortals.length > 0) ? l.customSpeedPortals : (local?.customSpeedPortals || []),
        };
        map.set(merged.id, merged);
      });
      allLevels.forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      allLevels = Array.from(map.values());
      saveLocalCommunityCache(allLevels);
    }
  } catch (err) {
    console.warn('fetchDiscoverLevels exception:', err);
  }

  // Filter by search query
  let filtered = allLevels;
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.creatorUsername.toLowerCase().includes(q)
    );
  }

  // Filter by difficulty
  const d = difficultyFilter.trim().toLowerCase();
  if (d && d !== 'all') {
    filtered = filtered.filter((l) => l.difficulty.toLowerCase() === d);
  }

  return filtered;
}

/**
 * Fetch levels created by a specific user/creator
 */
export async function fetchLevelsByCreator(creatorUsername: string): Promise<CustomLevel[]> {
  const clean = creatorUsername.toLowerCase().trim().replace(/^@/, '');
  const all = await fetchDiscoverLevels();
  return all.filter((l) => l.creatorUsername.toLowerCase().replace(/^@/, '') === clean);
}

/**
 * Clear all custom levels from device storage upon logout
 */
export function clearDeviceCustomLevels(): void {
  try {
    localStorage.removeItem(LOCAL_DRAFTS_KEY);
    localStorage.removeItem(LOCAL_COMMUNITY_CACHE_KEY);
    localStorage.removeItem('ant_farm_user_drafts');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('ant_farm_levels_') || k.startsWith('ant_farm_user_drafts'))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('Error clearing device custom levels', e);
  }
}

export function getUserLevelsKey(profile?: PlayerProfile): string {
  if (profile && profile.id && profile.id !== 'guest' && !profile.id.startsWith('guest_')) {
    return `ant_farm_levels_${profile.id}`;
  }
  return LOCAL_DRAFTS_KEY;
}

/**
 * Fetch all user-created levels.
 * For guests, returns local device drafts.
 * When logged in, fetches from account (Supabase + user account cache).
 */
export async function fetchUserCreatedLevels(profile?: PlayerProfile): Promise<CustomLevel[]> {
  const localList = getLocalUserDrafts(profile);

  if (!profile || profile.id === 'guest' || profile.id.startsWith('guest_')) {
    return localList;
  }

  const userKey = getUserLevelsKey(profile);

  try {
    // Strictly fetch by creator_id matching the authenticated profile ID
    const { data, error } = await supabaseAdmin
      .from('custom_levels')
      .select('*')
      .eq('creator_id', profile.id)
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const dbLevels: CustomLevel[] = data.map((row: any) => {
        const puc = row.power_up_chances || {};
        return {
          id: row.id,
          name: row.name,
          creatorId: row.creator_id,
          creatorUsername: row.creator_username || profile.username,
          creatorAvatarUrl: row.creator_avatar_url,
          themeColor: row.theme_color || '#38bdf8',
          bgColor: row.bg_color || '#090a0f',
          bgImage: row.bg_image || row.bgImage || puc.bgImage,
          anthills: row.anthills || [],
          cocoons: row.cocoons || [],
          customPowerUps:
            (Array.isArray(row.custom_power_ups) && row.custom_power_ups.length > 0)
              ? row.custom_power_ups
              : (Array.isArray(puc.customPowerUps) && puc.customPowerUps.length > 0)
              ? puc.customPowerUps
              : [],
          customSpeedPortals:
            (Array.isArray(row.custom_speed_portals) && row.custom_speed_portals.length > 0)
              ? row.custom_speed_portals
              : (Array.isArray(puc.customSpeedPortals) && puc.customSpeedPortals.length > 0)
              ? puc.customSpeedPortals
              : [],
          bossCount: row.boss_count ?? 1,
          powerUpChances: puc,
          durationSeconds: row.duration_seconds || 40,
          difficulty: row.difficulty || puc.difficulty || 'Normal',
          verified: Boolean(row.verified),
          published: Boolean(row.published),
          ratedByMisiori: Boolean((row as any).ratedByMisiori || (row as any).rated_by_misiori || puc.ratedByMisiori),
          plays: row.plays || 0,
          formations:
            (Array.isArray(row.formations) && row.formations.length > 0 ? row.formations : null) ||
            (Array.isArray(puc.formations) && puc.formations.length > 0 ? puc.formations : null) ||
            ['direct'],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      const localMap = new Map<string, CustomLevel>();
      localList.forEach((l) => localMap.set(l.id, l));

      const mergedMap = new Map<string, CustomLevel>();
      dbLevels.forEach((dbLvl) => {
        const local = localMap.get(dbLvl.id);
        const resolvedBgImage = dbLvl.bgImage || local?.bgImage;
        const resolvedPowerUps =
          (dbLvl.customPowerUps && dbLvl.customPowerUps.length > 0)
            ? dbLvl.customPowerUps
            : (local?.customPowerUps || []);
        const resolvedPortals =
          (dbLvl.customSpeedPortals && dbLvl.customSpeedPortals.length > 0)
            ? dbLvl.customSpeedPortals
            : (local?.customSpeedPortals || []);

        const merged: CustomLevel = {
          ...dbLvl,
          bgImage: resolvedBgImage,
          customPowerUps: resolvedPowerUps,
          customSpeedPortals: resolvedPortals,
          powerUpChances: {
            ...(dbLvl.powerUpChances || {}),
            ...(local?.powerUpChances || {}),
            customPowerUps: resolvedPowerUps,
            customSpeedPortals: resolvedPortals,
            bgImage: resolvedBgImage,
            difficulty: dbLvl.difficulty,
          },
        };
        mergedMap.set(merged.id, merged);
      });
      localList.forEach((l) => {
        if ((!l.creatorId || l.creatorId === profile.id) && !mergedMap.has(l.id)) {
          mergedMap.set(l.id, l);
        }
      });
      const finalList = Array.from(mergedMap.values());
      if (userKey) {
        try {
          localStorage.setItem(userKey, JSON.stringify(finalList));
        } catch (_) {}
      }
      return finalList;
    }
  } catch (e) {
    console.warn('fetchUserCreatedLevels remote fetch note:', e);
  }

  return localList;
}

/**
 * Get all drafts and user created levels for the player.
 * Checks player's storage key with fallback to local drafts key.
 */
export function getLocalUserDrafts(profile?: PlayerProfile): CustomLevel[] {
  const userKey = getUserLevelsKey(profile);
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local user levels', e);
  }

  // Fallback to general local drafts key if user-specific key had nothing
  if (userKey !== LOCAL_DRAFTS_KEY) {
    try {
      const rawFallback = localStorage.getItem(LOCAL_DRAFTS_KEY);
      if (rawFallback) {
        const parsed = JSON.parse(rawFallback);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

/**
 * Save draft level to account and local device storage.
 */
export async function saveDraftLevel(level: CustomLevel, profile?: PlayerProfile): Promise<void> {
  const isGuest = !profile || profile.id === 'guest' || profile.id.startsWith('guest_');
  const creatorId = (!isGuest && profile?.id) ? profile.id : (level.creatorId || 'guest');
  const creatorUsername = (!isGuest && profile?.username) ? profile.username : (level.creatorUsername || 'creator');

  // SECURITY: Prevent ownership transfer if created by another authenticated user
  if (!isGuest && level.creatorId && level.creatorId !== 'guest' && level.creatorId !== profile.id) {
    console.warn('Refusing to save draft: level belongs to another creator', level.creatorId, 'current:', profile.id);
    return;
  }

  const directFormations: AntFormation[] =
    level.formations && level.formations.length > 0
      ? (level.formations as AntFormation[])
      : (['direct'] as AntFormation[]);

  const updatedLvl: CustomLevel = {
    ...level,
    creatorId,
    creatorUsername,
    formations: directFormations,
    powerUpChances: {
      ...(level.powerUpChances || {}),
      formations: directFormations,
      customPowerUps: level.customPowerUps || [],
      customSpeedPortals: level.customSpeedPortals || [],
      bgImage: level.bgImage,
      difficulty: level.difficulty,
    },
    updatedAt: new Date().toISOString(),
  };

  // Keep last editing level updated so testing/exiting returns straight to it
  saveLastEditingLevel(updatedLvl);

  const userKey = getUserLevelsKey(profile);

  try {
    const list = getLocalUserDrafts(profile);
    const idx = list.findIndex((l) => l.id === updatedLvl.id);
    if (idx >= 0) {
      list[idx] = updatedLvl;
    } else {
      list.unshift(updatedLvl);
    }
    localStorage.setItem(userKey, JSON.stringify(list));
    if (userKey !== LOCAL_DRAFTS_KEY) {
      localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error saving draft level to localStorage', e);
  }

  // If authenticated, persist to account in Supabase
  if (!isGuest && profile?.id) {
    try {
      const payload: any = {
        id: updatedLvl.id,
        name: updatedLvl.name,
        creator_id: profile.id,
        creator_username: profile.username || 'creator',
        creator_avatar_url: profile.avatar_url,
        theme_color: updatedLvl.themeColor,
        bg_color: updatedLvl.bgColor || '#090a0f',
        bg_image: updatedLvl.bgImage,
        anthills: updatedLvl.anthills,
        cocoons: updatedLvl.cocoons,
        custom_power_ups: updatedLvl.customPowerUps || [],
        custom_speed_portals: updatedLvl.customSpeedPortals || [],
        boss_count: updatedLvl.bossCount,
        power_up_chances: {
          ...(updatedLvl.powerUpChances || {}),
          formations: directFormations,
          customPowerUps: updatedLvl.customPowerUps || [],
          customSpeedPortals: updatedLvl.customSpeedPortals || [],
          bgImage: updatedLvl.bgImage,
          difficulty: updatedLvl.difficulty,
        },
        duration_seconds: updatedLvl.durationSeconds,
        difficulty: updatedLvl.difficulty,
        verified: Boolean(updatedLvl.verified),
        published: Boolean(updatedLvl.published),
        formations: directFormations,
        updated_at: updatedLvl.updatedAt,
      };

      const { error: upsertErr } = await supabaseAdmin.from('custom_levels').upsert(
        payload,
        { onConflict: 'id' }
      );

      if (upsertErr) {
        console.warn('saveDraftLevel Supabase sync note:', upsertErr.message);
        const fallback = { ...payload };
        delete (fallback as any).formations;
        delete (fallback as any).bg_image;
        delete (fallback as any).custom_power_ups;
        delete (fallback as any).custom_speed_portals;
        await supabaseAdmin.from('custom_levels').upsert(fallback, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('saveDraftLevel Supabase sync note:', err);
    }
  }
}

/**
 * Delete a draft level from account and cache
 */
export async function deleteCustomLevelDraft(levelId: string, profile?: PlayerProfile): Promise<boolean> {
  // 1. Remove from all possible local storage draft keys
  try {
    const rawLocal = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((l: any) => l && l.id !== levelId);
        localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(filtered));
      }
    }
    const rawUserDrafts = localStorage.getItem('ant_farm_user_drafts');
    if (rawUserDrafts) {
      const parsed = JSON.parse(rawUserDrafts);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((l: any) => l && l.id !== levelId);
        localStorage.setItem('ant_farm_user_drafts', JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.warn('Error deleting draft from generic local storage', e);
  }

  // 2. Remove from user-specific draft key
  if (profile) {
    const userKey = getUserLevelsKey(profile);
    if (userKey) {
      try {
        const list = getLocalUserDrafts(profile).filter((l) => l.id !== levelId);
        localStorage.setItem(userKey, JSON.stringify(list));
      } catch (e) {
        console.warn('Error deleting draft from user cache', e);
      }
    }
  }

  // 3. Remove from community cache & saved chambers
  try {
    const comm = getLocalCommunityCache().filter((l) => l.id !== levelId);
    saveLocalCommunityCache(comm);
    const saved = getSavedChamberIds().filter((id) => id !== levelId);
    localStorage.setItem(LOCAL_SAVED_CHAMBERS_KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn('Error deleting from community cache / saved chambers', e);
  }

  // 4. Delete from Supabase
  try {
    const isMisiori = profile && isMisioriUser(profile.username, profile.email);
    if (isMisiori) {
      await supabaseAdmin.from('custom_levels').delete().eq('id', levelId);
      await supabase.from('custom_levels').delete().eq('id', levelId);
    } else if (profile && profile.id && !profile.id.startsWith('guest_')) {
      // Allow deletion if creator_id matches OR creator_username matches
      await supabaseAdmin
        .from('custom_levels')
        .delete()
        .eq('id', levelId)
        .eq('creator_id', profile.id);
      if (profile.username) {
        await supabaseAdmin
          .from('custom_levels')
          .delete()
          .eq('id', levelId)
          .ilike('creator_username', profile.username);
      }
      await supabase
        .from('custom_levels')
        .delete()
        .eq('id', levelId)
        .eq('creator_id', profile.id);
    }
  } catch (e) {
    console.warn('deleteCustomLevelDraft Supabase delete note:', e);
  }

  return true;
}

/**
 * Fetch saved chambers IDs for the player
 */
export function getSavedChamberIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_CHAMBERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter((id: string) => id && !id.startsWith('seed_'));
      }
    }
  } catch (e) {
    console.warn('Error reading saved chambers', e);
  }
  return [];
}

/**
 * Toggle saving a chamber (save / unsave)
 */
export function toggleSaveChamber(levelId: string): boolean {
  try {
    const current = getSavedChamberIds();
    let updated: string[];
    let isSaved = false;
    if (current.includes(levelId)) {
      updated = current.filter((id) => id !== levelId);
      isSaved = false;
    } else {
      updated = [levelId, ...current];
      isSaved = true;
    }
    localStorage.setItem(LOCAL_SAVED_CHAMBERS_KEY, JSON.stringify(updated));
    return isSaved;
  } catch (e) {
    console.warn('Error toggling saved chamber', e);
    return false;
  }
}

/**
 * Fetch full CustomLevel objects for saved chambers
 */
export async function fetchSavedChambers(): Promise<CustomLevel[]> {
  const savedIds = getSavedChamberIds();
  const allCommunity = await fetchDiscoverLevels();
  const drafts = getLocalUserDrafts();
  const map = new Map<string, CustomLevel>();
  [...allCommunity, ...drafts].forEach((l) => map.set(l.id, l));

  return savedIds.map((id) => map.get(id)).filter(Boolean) as CustomLevel[];
}

/**
 * Publish a verified level to the library
 */
export async function publishCustomLevel(
  level: CustomLevel,
  profile: PlayerProfile
): Promise<{ success: boolean; error?: string }> {
  if (!level.verified) {
    return {
      success: false,
      error: 'You must verify the level 100% without noclip before publishing!',
    };
  }
  if (!level.name || !level.name.trim()) {
    return {
      success: false,
      error: 'Please enter a name for your chamber before publishing!',
    };
  }

  // Security check: cannot publish a level owned by someone else
  if (level.creatorId && level.creatorId !== 'guest' && level.creatorId !== profile.id) {
    return {
      success: false,
      error: 'You can only publish chambers you created!',
    };
  }

  const cleanName = level.name.trim().toLowerCase();
  const publishedLevel: CustomLevel = {
    ...level,
    name: cleanName,
    creatorId: profile.id,
    creatorUsername: profile.username || 'creator',
    creatorAvatarUrl: profile.avatar_url,
    difficulty: level.difficulty || 'Unrated',
    published: true,
    verified: true,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save in local drafts and account as published
  await saveDraftLevel(publishedLevel, profile);

  // 2. Add to community cache
  const community = getLocalCommunityCache().filter((l) => l.id !== publishedLevel.id);
  community.unshift(publishedLevel);
  saveLocalCommunityCache(community);

  // 3. Persist to Supabase custom_levels table (or admin client)
  try {
    const directFormations =
      publishedLevel.formations && publishedLevel.formations.length > 0
        ? publishedLevel.formations
        : ['direct'];

    const payload: any = {
      id: publishedLevel.id,
      name: publishedLevel.name,
      creator_id: profile.id,
      creator_username: profile.username,
      creator_avatar_url: profile.avatar_url,
      theme_color: publishedLevel.themeColor,
      bg_color: publishedLevel.bgColor || '#090a0f',
      bg_image: publishedLevel.bgImage,
      anthills: publishedLevel.anthills,
      cocoons: publishedLevel.cocoons,
      custom_power_ups: publishedLevel.customPowerUps || [],
      custom_speed_portals: publishedLevel.customSpeedPortals || [],
      boss_count: publishedLevel.bossCount,
      power_up_chances: {
        ...(publishedLevel.powerUpChances || {}),
        formations: directFormations,
        customPowerUps: publishedLevel.customPowerUps || [],
        customSpeedPortals: publishedLevel.customSpeedPortals || [],
        bgImage: publishedLevel.bgImage,
      },
      duration_seconds: publishedLevel.durationSeconds,
      difficulty: publishedLevel.difficulty,
      verified: true,
      published: true,
      plays: 0,
      formations: directFormations,
      updated_at: new Date().toISOString(),
    };

    // Use supabaseAdmin to ensure bypass of RLS
    const { error: adminErr } = await supabaseAdmin
      .from('custom_levels')
      .upsert(payload, { onConflict: 'id' });

    if (adminErr) {
      console.warn('Supabase custom_levels upsert note:', adminErr.message);
      const fallback = { ...payload };
      delete (fallback as any).formations;
      delete (fallback as any).bg_image;
      delete (fallback as any).custom_power_ups;
      delete (fallback as any).custom_speed_portals;
      await supabaseAdmin.from('custom_levels').upsert(fallback, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('publishCustomLevel remote exception:', err);
  }

  return { success: true };
}

/**
 * Rename a custom level and preserve verified status so it can be republished directly
 */
export async function renameCustomLevel(
  levelId: string,
  newName: string,
  profile: PlayerProfile
): Promise<{ success: boolean; level?: CustomLevel; error?: string }> {
  if (!newName || !newName.trim()) {
    return { success: false, error: 'Chamber name cannot be empty!' };
  }
  const cleanName = newName.trim().toLowerCase();
  const list = getLocalUserDrafts(profile);
  const found = list.find((l) => l.id === levelId);
  if (!found) {
    return { success: false, error: 'Chamber not found' };
  }

  if (found.creatorId && found.creatorId !== profile.id) {
    return { success: false, error: 'Cannot rename a chamber created by another player' };
  }

  const updatedLevel: CustomLevel = {
    ...found,
    name: cleanName,
    // Changing the name NEVER invalidates verification!
    verified: Boolean(found.verified),
    updatedAt: new Date().toISOString(),
  };

  await saveDraftLevel(updatedLevel, profile);

  // If already published, update library entry too
  if (updatedLevel.published && updatedLevel.verified) {
    try {
      await supabaseAdmin
        .from('custom_levels')
        .update({
          name: cleanName,
          updated_at: updatedLevel.updatedAt,
        })
        .eq('id', levelId)
        .eq('creator_id', profile.id);

      const comm = getLocalCommunityCache().map((l) =>
        l.id === levelId ? { ...l, name: cleanName } : l
      );
      saveLocalCommunityCache(comm);
    } catch (e) {
      console.warn('rename update custom_levels error', e);
    }
  }

  return { success: true, level: updatedLevel };
}

/**
 * When a user changes their username, update creator_username across all their created levels
 * (in database, local user drafts, and community cache) so levels display the new username.
 */
export async function updateCreatorUsernameInAllLevels(
  creatorId: string,
  newUsername: string
): Promise<void> {
  if (!creatorId || creatorId === 'guest' || creatorId.startsWith('guest_')) {
    return;
  }

  const clean = newUsername.trim();
  if (!clean) return;

  try {
    // 1. Update Supabase custom_levels table
    await supabaseAdmin
      .from('custom_levels')
      .update({
        creator_username: clean,
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', creatorId);
  } catch (e) {
    console.warn('updateCreatorUsernameInAllLevels remote update error', e);
  }

  try {
    // 2. Update community levels local cache
    const cached = getLocalCommunityCache();
    let cacheChanged = false;
    const updatedCache = cached.map((lvl) => {
      if (lvl.creatorId === creatorId) {
        cacheChanged = true;
        return { ...lvl, creatorUsername: clean };
      }
      return lvl;
    });
    if (cacheChanged) {
      saveLocalCommunityCache(updatedCache);
    }
  } catch (e) {
    console.warn('updateCreatorUsernameInAllLevels cache update error', e);
  }

  try {
    // 3. Update player's own local drafts list
    const userKey = `ant_farm_levels_${creatorId}`;
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const updatedList = list.map((lvl: CustomLevel) => {
          if (!lvl.creatorId || lvl.creatorId === creatorId) {
            return { ...lvl, creatorUsername: clean };
          }
          return lvl;
        });
        localStorage.setItem(userKey, JSON.stringify(updatedList));
      }
    }
  } catch (e) {
    console.warn('updateCreatorUsernameInAllLevels user drafts update error', e);
  }
}

/**
 * ONLY @misiori can rate a level difficulty!
 */
export async function rateLevelDifficulty(
  levelId: string,
  newDifficulty: CustomLevelDifficulty,
  profile: PlayerProfile
): Promise<boolean> {
  if (!isMisioriUser(profile.username, profile.email)) {
    console.error('Unauthorized: ONLY @misiori can rate level difficulty!');
    return false;
  }

  const isRated = newDifficulty !== 'Unrated';

  // Update in community cache
  const community = getLocalCommunityCache();
  const found = community.find((l) => l.id === levelId);
  if (found) {
    found.difficulty = newDifficulty;
    found.verified = true;
    (found as any).ratedByMisiori = isRated;
    found.updatedAt = new Date().toISOString();
    saveLocalCommunityCache(community);
  }

  // Update in local drafts if exists
  const drafts = getLocalUserDrafts(profile);
  const dFound = drafts.find((l) => l.id === levelId);
  if (dFound) {
    dFound.difficulty = newDifficulty;
    dFound.verified = true;
    (dFound as any).ratedByMisiori = isRated;
    saveDraftLevel(dFound, profile);
  }

  // Update in Supabase via supabaseAdmin and supabase
  try {
    const updatePayload = {
      difficulty: newDifficulty,
      verified: true,
      updated_at: new Date().toISOString(),
    };
    await supabaseAdmin
      .from('custom_levels')
      .update(updatePayload)
      .eq('id', levelId);
    await supabase
      .from('custom_levels')
      .update(updatePayload)
      .eq('id', levelId);
  } catch (e) {
    console.warn('rateLevelDifficulty exception:', e);
  }

  return true;
}

/**
 * Delete a community level.
 * Allowed for @misiori (inappropriate levels) OR the level's creator!
 */
export async function deleteCommunityLevel(
  levelId: string,
  profile?: PlayerProfile
): Promise<boolean> {
  const isMisiori = profile && isMisioriUser(profile.username, profile.email);
  const community = getLocalCommunityCache();
  const targetLevel = community.find((l) => l.id === levelId);

  const isOwner = Boolean(
    profile &&
    profile.id &&
    !profile.id.startsWith('guest_') &&
    targetLevel &&
    (targetLevel.creatorId === profile.id ||
      (profile.username && targetLevel.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
  );

  if (!isMisiori && !isOwner) {
    console.error('Unauthorized: ONLY @misiori or the level creator can delete this level!');
    return false;
  }

  // Remove from community cache
  const updatedCommunity = community.filter((l) => l.id !== levelId);
  saveLocalCommunityCache(updatedCommunity);

  // Remove from saved chambers
  const saved = getSavedChamberIds().filter((id) => id !== levelId);
  localStorage.setItem(LOCAL_SAVED_CHAMBERS_KEY, JSON.stringify(saved));

  // Remove from user drafts cache if present
  if (profile) {
    const userKey = getUserLevelsKey(profile);
    if (userKey) {
      const list = getLocalUserDrafts(profile).filter((l) => l.id !== levelId);
      localStorage.setItem(userKey, JSON.stringify(list));
    }
  }

  // Delete from Supabase via supabaseAdmin and supabase
  try {
    if (isMisiori) {
      await supabaseAdmin.from('custom_levels').delete().eq('id', levelId);
      await supabase.from('custom_levels').delete().eq('id', levelId);
    } else if (profile?.id) {
      await supabaseAdmin.from('custom_levels').delete().eq('id', levelId).eq('creator_id', profile.id);
      if (profile.username) {
        await supabaseAdmin.from('custom_levels').delete().eq('id', levelId).ilike('creator_username', profile.username);
      }
      await supabase.from('custom_levels').delete().eq('id', levelId).eq('creator_id', profile.id);
    }
  } catch (e) {
    console.warn('deleteCommunityLevel exception:', e);
  }

  return true;
}

/**
 * Universal helper: check if a level gives points and sugar cubes.
 * - Official campaign levels give points by default!
 * - Custom levels: must be rated by misiori (difficulty !== 'Unrated' or ratedByMisiori)
 * - Levels tested in editor verification mode do not give points.
 */
export function isLevelRated(level: LevelConfig | CustomLevel | any | null | undefined): boolean {
  if (!level) return false;
  // If it's an official campaign level (not custom)
  const isCustom = Boolean(level.isCustom || level.customData || level.customLevelId);
  if (!isCustom) {
    // Official levels give points by default
    return true;
  }
  // Creator verification mode inside editor: not rated
  if (level.isVerification) {
    return false;
  }
  // Custom level: ONLY rated if rated by misiori
  const custom = level.customData || level;
  if (custom.ratedByMisiori || custom.rated_by_misiori) {
    return true;
  }
  return false;
}

/**
 * Convert a CustomLevel into a LevelConfig compatible with GameCanvas
 */
export function customLevelToLevelConfig(
  custom: CustomLevel,
  isVerification = false
): LevelConfig & { customData: CustomLevel; isVerification?: boolean } {
  const numId = getCustomLevelNumberId(custom.id);

  const diffColorMap: Record<string, string> = {
    Unrated: '#94a3b8',
    Easy: '#38bdf8',
    Normal: '#34d399',
    Hard: '#fbbf24',
    Harder: '#f97316',
    Insane: '#ef4444',
    Crazy: '#f43f5e',
  };

  // A custom level is rated for leaderboard/points ONLY if rated by misiori
  const isRatedByMisiori = Boolean(
    (custom as any).ratedByMisiori ||
    (custom as any).rated_by_misiori
  );

  // Verification mode is active during creator test in LevelEditor
  const effectiveVerification = Boolean(isVerification && !isRatedByMisiori);
  const isRated = Boolean(isRatedByMisiori && !effectiveVerification);

  // The intended difficulty chosen in the editor (or default Normal)
  const chosenDifficulty: CustomLevelDifficulty =
    (custom.difficulty && custom.difficulty !== 'Unrated')
      ? custom.difficulty
      : ((custom.powerUpChances as any)?.difficulty && (custom.powerUpChances as any)?.difficulty !== 'Unrated')
      ? (custom.powerUpChances as any).difficulty
      : 'Normal';

  const powerUps =
    (custom.customPowerUps && custom.customPowerUps.length > 0)
      ? custom.customPowerUps
      : ((custom.powerUpChances as any)?.customPowerUps && (custom.powerUpChances as any).customPowerUps.length > 0)
      ? (custom.powerUpChances as any).customPowerUps
      : [];

  const portals =
    (custom.customSpeedPortals && custom.customSpeedPortals.length > 0)
      ? custom.customSpeedPortals
      : ((custom.powerUpChances as any)?.customSpeedPortals && (custom.powerUpChances as any).customSpeedPortals.length > 0)
      ? (custom.powerUpChances as any).customSpeedPortals
      : [];

  const bgImage = custom.bgImage || (custom.powerUpChances as any)?.bgImage;

  // When Crazy difficulty is chosen, set BPM to 215 (exact BPM of Omega Extinction!)
  const isCrazy = chosenDifficulty === 'Crazy';
  const effectiveDifficulty: 'Easy' | 'Normal' | 'Hard' | 'Harder' | 'Insane' | 'Crazy' =
    chosenDifficulty === 'Unrated' ? 'Normal' : chosenDifficulty;
  const bpm = isCrazy ? 215 : 135;
  const maxAnts = isCrazy ? 160 : 80;

  return {
    id: numId,
    name: custom.name,
    difficulty: effectiveDifficulty,
    difficultyColor: diffColorMap[chosenDifficulty] || '#38bdf8',
    songUrl: isCrazy ? 'https://www.newgrounds.com/audio/listen/1424000' : 'https://www.newgrounds.com/audio/listen/1622289',
    songTitle: custom.name,
    artist: custom.creatorUsername,
    bpm,
    durationSeconds: custom.durationSeconds || 40,
    themeColor: custom.themeColor || '#38bdf8',
    bgColor: custom.bgColor || '#090a0f',
    bgImage: bgImage,
    bgOpacity: custom.bgOpacity ?? (custom.powerUpChances as any)?.bgOpacity ?? 40,
    description: `by ${custom.creatorUsername} • ${custom.anthills.length} anthills, ${custom.cocoons.length} cocoons, ${custom.bossCount} bosses`,
    spawnerCount: Math.max(1, custom.anthills.length),
    maxAnts,
    isEndless: false,
    mechanicId: 'custom_level',
    mechanicName: 'custom chamber',
    mechanicHint: 'custom layout created with chamber editor',
    formations:
      (Array.isArray(custom.formations) && custom.formations.length > 0 ? custom.formations : null) ||
      (custom.powerUpChances && Array.isArray((custom.powerUpChances as any).formations) && (custom.powerUpChances as any).formations.length > 0 ? (custom.powerUpChances as any).formations : null) ||
      ['direct'],
    isRated,
    isCustom: true,
    customLevelId: custom.id,
    customPowerUps: powerUps,
    customSpeedPortals: portals,
    customData: {
      ...custom,
      bgImage,
      customPowerUps: powerUps,
      customSpeedPortals: portals,
      difficulty: chosenDifficulty,
      ratedByMisiori: isRatedByMisiori,
      verified: Boolean(custom.verified || isRatedByMisiori),
      formations:
        (Array.isArray(custom.formations) && custom.formations.length > 0 ? custom.formations : null) ||
        (custom.powerUpChances && Array.isArray((custom.powerUpChances as any).formations) && (custom.powerUpChances as any).formations.length > 0 ? (custom.powerUpChances as any).formations : null) ||
        ['direct'],
    },
    isVerification: effectiveVerification,
  };
}
