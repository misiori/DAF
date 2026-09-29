export const SUPABASE_SETUP_SQL = `-- ===============================================================
-- DAF (Dangerous Ant Farm) - SUPABASE DATABASE INITIALIZATION SCRIPT
-- rhythm-based game by misiori
--
-- Features:
--  1. public.profiles:
--       - id (UUID, PK referencing auth.users)
--       - username (TEXT, case-insensitive unique)
--       - email (TEXT)
--       - active_skin (TEXT)
--       - unlocked_skins (TEXT[])
--       - sugar_cubes (INTEGER)
--       - high_scores (JSONB): e.g. {"1": 1540, "2": 2100}
--       - beaten_levels (INTEGER[]): e.g. [1, 2, 3] for boolean beaten status
--       - level_progress (JSONB): e.g. {"1": 100, "2": 78} for exact percentage (0-100)
--       - daily_challenges (JSONB): synced status across all devices
--           {"date": "YYYY-MM-DD", "progress": {}, "completed": {}, "claimed": {}}
--       - bonus_pts (INTEGER)
--       - avatar_url (TEXT)
--       - created_at, updated_at (TIMESTAMPTZ)
--  2. Strict Case-Insensitive Unique Username Index
--  3. Row Level Security (RLS) policies
--  4. Helper RPCs:
--       - is_level_beaten(p_user_id UUID, p_level_id INTEGER) -> BOOLEAN
--       - get_level_percentage(p_user_id UUID, p_level_id INTEGER) -> INTEGER
--       - get_email_by_username(p_username TEXT) -> TEXT
--       - check_username_available(p_username TEXT, p_exclude_id UUID) -> BOOLEAN
--  5. Automatic profile trigger on user signup
-- ===============================================================

-- 1. Create the public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  active_skin TEXT DEFAULT 'amber' NOT NULL,
  unlocked_skins TEXT[] DEFAULT ARRAY['amber'] NOT NULL,
  sugar_cubes INTEGER DEFAULT 0 NOT NULL,
  high_scores JSONB DEFAULT '{}'::jsonb NOT NULL,
  beaten_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL,
  level_progress JSONB DEFAULT '{}'::jsonb NOT NULL,
  daily_challenges JSONB DEFAULT '{"date": "", "progress": {}, "completed": {}, "claimed": {}}'::jsonb NOT NULL,
  bonus_pts INTEGER DEFAULT 0 NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist if table was created in an earlier migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='beaten_levels') THEN
    ALTER TABLE public.profiles ADD COLUMN beaten_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='level_progress') THEN
    ALTER TABLE public.profiles ADD COLUMN level_progress JSONB DEFAULT '{}'::jsonb NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='daily_challenges') THEN
    ALTER TABLE public.profiles ADD COLUMN daily_challenges JSONB DEFAULT '{"date": "", "progress": {}, "completed": {}, "claimed": {}}'::jsonb NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='bonus_pts') THEN
    ALTER TABLE public.profiles ADD COLUMN bonus_pts INTEGER DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. CASE-INSENSITIVE UNIQUE USERNAME INDEX
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci_unique 
  ON public.profiles (LOWER(TRIM(username)));

-- Fast GIN indexes for querying JSONB progress & arrays
CREATE INDEX IF NOT EXISTS idx_profiles_beaten_levels ON public.profiles USING GIN (beaten_levels);
CREATE INDEX IF NOT EXISTS idx_profiles_level_progress ON public.profiles USING GIN (level_progress);
CREATE INDEX IF NOT EXISTS idx_profiles_daily_challenges ON public.profiles USING GIN (daily_challenges);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies
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

-- 5. Helper RPC: Check boolean beaten status for a level
CREATE OR REPLACE FUNCTION public.is_level_beaten(p_user_id UUID, p_level_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND (
        p_level_id = ANY(beaten_levels)
        OR COALESCE((level_progress->>(p_level_id::text))::INTEGER, 0) >= 100
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_level_beaten(UUID, INTEGER) TO anon, authenticated;

-- 6. Helper RPC: Get completion percentage for a level (0 - 100)
CREATE OR REPLACE FUNCTION public.get_level_percentage(p_user_id UUID, p_level_id INTEGER)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    CASE 
      WHEN p_level_id = ANY(beaten_levels) THEN 100
      ELSE COALESCE((level_progress->>(p_level_id::text))::INTEGER, 0)
    END
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_level_percentage(UUID, INTEGER) TO anon, authenticated;

-- 7. Helper RPC: Case-insensitive Email lookup by username for login
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

-- 8. Helper RPC: Check if username is available (case-insensitive)
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

-- 9. Trigger function: Auto-provision profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  desired_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := desired_username;

  -- Ensure username is unique case-insensitively
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(username)) = LOWER(TRIM(final_username))) LOOP
    final_username := desired_username || counter::TEXT;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    username,
    email,
    active_skin,
    unlocked_skins,
    sugar_cubes,
    high_scores,
    beaten_levels,
    level_progress,
    daily_challenges,
    bonus_pts
  )
  VALUES (
    new.id,
    final_username,
    new.email,
    'amber',
    ARRAY['amber'],
    0,
    '{}'::jsonb,
    ARRAY[]::INTEGER[],
    '{}'::jsonb,
    '{"date": "", "progress": {}, "completed": {}, "claimed": {}}'::jsonb,
    0
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
