import { createClient } from '@supabase/supabase-js';
import { PlayerProfile } from '../types/game';

export const SUPABASE_URL = 'https://amyvyurvnnyeskzbjxpa.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteXZ5dXJ2bm55ZXNremJqeHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDYyMjIsImV4cCI6MjEwNTk4MjIyMn0.sl7UmEBZsLilBUZTxlZu7fCYLJ5qs8Ub6lQt8S1m2SA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SQL_SETUP_SCRIPT = `-- ===============================================================
-- DANGEROUS ANT FARM - SUPABASE DATABASE INITIALIZATION SCRIPT
-- Features:
--  1. public.profiles with stats, beaten_levels, avatar_url
--  2. Case-insensitive unique username index (LOWER(TRIM(username)))
--  3. Row Level Security (RLS) policies
--  4. Automatic auth trigger for new user creation
--  5. Case-insensitive username login RPC: get_email_by_username
--  6. Case-insensitive username availability check RPC: check_username_available
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  active_skin TEXT DEFAULT 'amber' NOT NULL,
  unlocked_skins TEXT[] DEFAULT ARRAY['amber'] NOT NULL,
  sugar_cubes INTEGER DEFAULT 0 NOT NULL,
  high_scores JSONB DEFAULT '{}'::jsonb NOT NULL,
  beaten_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL,
  avatar_url TEXT,
  bonus_pts INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='beaten_levels') THEN
    ALTER TABLE public.profiles ADD COLUMN beaten_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='bonus_pts') THEN
    ALTER TABLE public.profiles ADD COLUMN bonus_pts INTEGER DEFAULT 0 NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='level_progress') THEN
    ALTER TABLE public.profiles ADD COLUMN level_progress JSONB DEFAULT '{}'::jsonb NOT NULL;
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci_unique 
  ON public.profiles (LOWER(TRIM(username)));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM public.profiles 
  WHERE LOWER(TRIM(username)) = LOWER(TRIM(p_username)) 
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(username)) = LOWER(TRIM(p_username))
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  desired_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := desired_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(username)) = LOWER(TRIM(final_username))) LOOP
    final_username := desired_username || counter::TEXT;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.profiles (
    id, username, email, active_skin, unlocked_skins, sugar_cubes, high_scores, beaten_levels, bonus_pts
  ) VALUES (
    new.id, final_username, new.email, 'amber', ARRAY['amber'], 0, '{}'::jsonb, ARRAY[]::INTEGER[], 0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

const LOCAL_STORAGE_KEY = 'dangerous_ant_farm_guest_profile';

export const getGuestProfile = (): PlayerProfile => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up legacy demo accounts if present
      if (parsed.username && parsed.username.startsWith('Worker_Ant_')) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else {
        if (!parsed.beaten_levels) {
          parsed.beaten_levels = [];
        }
        if (!parsed.level_progress) {
          parsed.level_progress = {};
        }
        // Normalize beaten_levels to numbers
        parsed.beaten_levels = (parsed.beaten_levels || []).map(Number);
        // Ensure any beaten levels have 100% progress
        parsed.beaten_levels.forEach((lvlId: number) => {
          parsed.level_progress[lvlId] = 100;
        });
        // And if level_progress has 100%, ensure it is in beaten_levels
        Object.entries(parsed.level_progress).forEach(([k, v]) => {
          if (Number(v) >= 100 && !parsed.beaten_levels.includes(Number(k))) {
            parsed.beaten_levels.push(Number(k));
          }
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local profile', e);
  }

  const defaultProfile: PlayerProfile = {
    id: 'guest',
    username: 'Guest',
    email: undefined,
    active_skin: 'amber',
    unlocked_skins: ['amber'],
    sugar_cubes: 0,
    high_scores: {},
    beaten_levels: [],
    level_progress: {},
  };
  saveGuestProfile(defaultProfile);
  return defaultProfile;
};

export const saveGuestProfile = (profile: PlayerProfile) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save guest profile to localStorage', e);
  }
};

/**
 * Fetch profile from Supabase with graceful fallback
 */
export async function fetchProfileById(userId: string): Promise<PlayerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchProfile error:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      active_skin: data.active_skin || 'amber',
      unlocked_skins: data.unlocked_skins || ['amber'],
      sugar_cubes: data.sugar_cubes || 0,
      high_scores: data.high_scores || {},
      beaten_levels: (data.beaten_levels || []).map(Number),
      level_progress: data.level_progress || {},
      avatar_url: data.avatar_url,
      created_at: data.created_at,
    };
  } catch (err) {
    console.warn('fetchProfileById exception:', err);
    return null;
  }
}

/**
 * Update profile high score, skin, beaten_levels, avatar
 */
export async function updateProfile(
  userId: string,
  updates: Partial<PlayerProfile>
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id');

    if (error) {
      console.warn('Supabase updateProfile error:', error.message);
    }

    if (!data || data.length === 0) {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: updates.username || 'Player',
          ...updates,
          updated_at: new Date().toISOString(),
        });
      if (upsertErr) {
        console.warn('Supabase upsertProfile fallback error:', upsertErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('updateProfile exception:', err);
    return false;
  }
}

/**
 * Fetch leaderboard profiles sorted by total PTS
 */
export async function fetchLeaderboard(): Promise<(PlayerProfile & { total_pts: number; levels_cleared: number })[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, active_skin, unlocked_skins, sugar_cubes, high_scores, beaten_levels, level_progress, avatar_url, created_at')
      .limit(30);

    if (error || !data || data.length === 0) {
      return [];
    }

    const players: (PlayerProfile & { total_pts: number; levels_cleared: number })[] = data.map((row) => {
      const highScores = (row.high_scores as Record<string, number>) || {};
      const total_pts = Object.values(highScores).reduce((a, b) => a + (Number(b) || 0), 0);
      const beaten = Array.isArray(row.beaten_levels) ? row.beaten_levels.map(Number) : [];
      const levels_cleared = beaten.length;

      return {
        id: row.id,
        username: row.username,
        email: row.email,
        active_skin: row.active_skin || 'amber',
        unlocked_skins: row.unlocked_skins || ['amber'],
        sugar_cubes: row.sugar_cubes || 0,
        high_scores: highScores,
        beaten_levels: beaten,
        level_progress: (row.level_progress as Record<string, number>) || {},
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        total_pts,
        levels_cleared,
      };
    });

    // Sort descending by total_pts
    players.sort((a, b) => b.total_pts - a.total_pts);
    return players;
  } catch (err) {
    console.warn('fetchLeaderboard exception:', err);
    return [];
  }
}

/**
 * Search profiles by username for the Profile tab search
 */
export async function searchProfiles(query: string): Promise<PlayerProfile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, active_skin, unlocked_skins, sugar_cubes, high_scores, beaten_levels, level_progress, avatar_url, created_at')
      .ilike('username', `%${trimmed}%`)
      .limit(10);

    if (error) {
      console.warn('searchProfiles error:', error.message);
      return [];
    }

    const list: PlayerProfile[] = (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      active_skin: row.active_skin || 'amber',
      unlocked_skins: row.unlocked_skins || ['amber'],
      sugar_cubes: row.sugar_cubes || 0,
      high_scores: row.high_scores || {},
      beaten_levels: Array.isArray(row.beaten_levels) ? row.beaten_levels.map(Number) : [],
      level_progress: (row.level_progress as Record<string, number>) || {},
      avatar_url: row.avatar_url,
      created_at: row.created_at,
    }));

    return list;
  } catch (err) {
    console.warn('searchProfiles exception:', err);
    return [];
  }
}

/**
 * Helper to resolve email for username-based login
 */
export async function findEmailByUsername(username: string): Promise<string | null> {
  const clean = username.trim();
  if (clean.includes('@')) return clean;

  try {
    // First try the RPC function
    const { data: rpcEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
      p_username: clean,
    });

    if (!rpcErr && rpcEmail) {
      return rpcEmail;
    }

    // Direct table query fallback
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .ilike('username', clean)
      .maybeSingle();

    if (!error && data?.email) {
      return data.email;
    }
  } catch (e) {
    console.warn('findEmailByUsername error:', e);
  }
  return null;
}

/**
 * Check if a username is already taken (case-insensitive)
 */
export async function isUsernameTaken(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return true;

  try {
    // 1. Try checking via RPC if available
    const { data: isAvailable, error: rpcErr } = await supabase.rpc('check_username_available', {
      p_username: clean,
      p_exclude_id: excludeUserId && !excludeUserId.startsWith('guest') ? excludeUserId : null,
    });

    if (!rpcErr && typeof isAvailable === 'boolean') {
      return !isAvailable;
    }

    // 2. Direct case-insensitive table query
    let query = supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', clean);

    if (excludeUserId && !excludeUserId.startsWith('guest')) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data.some(
        (row) => row.username.trim().toLowerCase().replace(/^@/, '') === clean
      );
    }
  } catch (err) {
    console.warn('isUsernameTaken check exception:', err);
  }

  return false;
}
