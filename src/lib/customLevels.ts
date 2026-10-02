import { LevelConfig, PlayerProfile } from '../types/game';
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
  anthills: CustomAnthillPlacement[];
  cocoons: CustomCocoonPlacement[];
  bossCount: number;
  powerUpChances: PowerUpChances;
  durationSeconds: number;
  difficulty: CustomLevelDifficulty;
  verified: boolean;
  published: boolean;
  plays: number;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_DRAFTS_KEY = 'daf_custom_levels_drafts_v1';
const LOCAL_SAVED_CHAMBERS_KEY = 'daf_saved_chambers_ids_v1';
const LOCAL_COMMUNITY_CACHE_KEY = 'daf_community_levels_cache_v1';

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
function getLocalCommunityCache(): CustomLevel[] {
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
        anthills: row.anthills || [],
        cocoons: row.cocoons || [],
        bossCount: Number(row.boss_count ?? row.bossCount ?? 1),
        powerUpChances: row.power_up_chances || row.powerUpChances || {
          speed: 50,
          honeyTraps: 50,
          nukeBomb: 40,
          freezeBomb: 40,
        },
        durationSeconds: Number(row.duration_seconds ?? row.durationSeconds ?? 40),
        difficulty: row.difficulty || 'Unrated',
        verified: Boolean(row.verified),
        published: true,
        plays: Number(row.plays || 0),
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      }));

      // Merge remote with seeds without duplicate ids
      const map = new Map<string, CustomLevel>();
      remoteLevels.forEach((l) => map.set(l.id, l));
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
 * Get all drafts and user created levels for the local player
 */
export function getLocalUserDrafts(): CustomLevel[] {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local drafts', e);
  }
  return [];
}

/**
 * Save draft level to local storage
 */
export function saveDraftLevel(level: CustomLevel): void {
  try {
    const list = getLocalUserDrafts();
    const idx = list.findIndex((l) => l.id === level.id);
    if (idx >= 0) {
      list[idx] = { ...level, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...level, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving draft', e);
  }
}

/**
 * Delete a draft level
 */
export function deleteCustomLevelDraft(levelId: string): void {
  try {
    const list = getLocalUserDrafts().filter((l) => l.id !== levelId);
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error deleting draft', e);
  }
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

  // 1. Save in local drafts as published
  saveDraftLevel(publishedLevel);

  // 2. Add to community cache
  const community = getLocalCommunityCache().filter((l) => l.id !== publishedLevel.id);
  community.unshift(publishedLevel);
  saveLocalCommunityCache(community);

  // 3. Persist to Supabase custom_levels table (or admin client)
  try {
    const payload = {
      id: publishedLevel.id,
      name: publishedLevel.name,
      creator_id: profile.id,
      creator_username: profile.username,
      creator_avatar_url: profile.avatar_url,
      theme_color: publishedLevel.themeColor,
      bg_color: publishedLevel.bgColor || '#090a0f',
      anthills: publishedLevel.anthills,
      cocoons: publishedLevel.cocoons,
      boss_count: publishedLevel.bossCount,
      power_up_chances: publishedLevel.powerUpChances,
      duration_seconds: publishedLevel.durationSeconds,
      difficulty: publishedLevel.difficulty,
      verified: true,
      published: true,
      plays: 0,
      updated_at: new Date().toISOString(),
    };

    // Use supabaseAdmin to ensure bypass of RLS
    const { error: adminErr } = await supabaseAdmin
      .from('custom_levels')
      .upsert(payload, { onConflict: 'id' });

    if (adminErr) {
      console.warn('Supabase custom_levels upsert note:', adminErr.message);
    }
  } catch (err) {
    console.warn('publishCustomLevel remote exception:', err);
  }

  return { success: true };
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

  // Update in community cache
  const community = getLocalCommunityCache();
  const found = community.find((l) => l.id === levelId);
  if (found) {
    found.difficulty = newDifficulty;
    found.updatedAt = new Date().toISOString();
    saveLocalCommunityCache(community);
  }

  // Update in local drafts if exists
  const drafts = getLocalUserDrafts();
  const dFound = drafts.find((l) => l.id === levelId);
  if (dFound) {
    dFound.difficulty = newDifficulty;
    saveDraftLevel(dFound);
  }

  // Update in Supabase via supabaseAdmin
  try {
    const { error } = await supabaseAdmin
      .from('custom_levels')
      .update({ difficulty: newDifficulty, updated_at: new Date().toISOString() })
      .eq('id', levelId);

    if (error) {
      console.warn('Supabase rate difficulty error:', error.message);
    }
  } catch (e) {
    console.warn('rateLevelDifficulty exception:', e);
  }

  return true;
}

/**
 * ONLY @misiori can delete inappropriate levels!
 */
export async function deleteCommunityLevel(
  levelId: string,
  profile: PlayerProfile
): Promise<boolean> {
  if (!isMisioriUser(profile.username, profile.email)) {
    console.error('Unauthorized: ONLY @misiori can delete inappropriate levels!');
    return false;
  }

  // Remove from community cache
  const community = getLocalCommunityCache().filter((l) => l.id !== levelId);
  saveLocalCommunityCache(community);

  // Remove from saved chambers
  const saved = getSavedChamberIds().filter((id) => id !== levelId);
  localStorage.setItem(LOCAL_SAVED_CHAMBERS_KEY, JSON.stringify(saved));

  // Delete from Supabase via supabaseAdmin
  try {
    const { error } = await supabaseAdmin
      .from('custom_levels')
      .delete()
      .eq('id', levelId);

    if (error) {
      console.warn('Supabase delete level error:', error.message);
    }
  } catch (e) {
    console.warn('deleteCommunityLevel exception:', e);
  }

  return true;
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

  return {
    id: numId,
    name: custom.name,
    difficulty: custom.difficulty === 'Unrated' ? 'Normal' : (custom.difficulty as any),
    difficultyColor: diffColorMap[custom.difficulty] || '#38bdf8',
    songUrl: 'https://www.newgrounds.com/audio/listen/1622289',
    songTitle: custom.name,
    artist: custom.creatorUsername,
    bpm: 135,
    durationSeconds: custom.durationSeconds || 40,
    themeColor: custom.themeColor || '#38bdf8',
    bgColor: custom.bgColor || '#090a0f',
    description: `by ${custom.creatorUsername} • ${custom.anthills.length} anthills, ${custom.cocoons.length} cocoons, ${custom.bossCount} bosses`,
    spawnerCount: Math.max(1, custom.anthills.length),
    maxAnts: 80,
    isEndless: false,
    mechanicId: 'custom_level',
    mechanicName: 'custom chamber',
    mechanicHint: 'custom layout created with chamber editor',
    customData: custom,
    isVerification,
  };
}
