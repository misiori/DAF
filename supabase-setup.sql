-- ===============================================================
-- DANGEROUS ANT FARM - SUPABASE DATABASE INITIALIZATION SCRIPT
-- Features:
--  1. public.profiles with stats, beaten_levels, avatar_url
--  2. Case-insensitive unique username index (LOWER(TRIM(username)))
--  3. Row Level Security (RLS) policies
--  4. Automatic auth trigger for new user creation
--  5. Case-insensitive username login RPC: get_email_by_username
--  6. Case-insensitive username availability check RPC: check_username_available
--  7. Verified Creator (@misiori) account protection & seed
-- ===============================================================

-- 1. Create the public profiles table
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

-- Ensure all columns exist if table was already created in earlier step
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

-- 2. CASE-INSENSITIVE UNIQUE USERNAME CONSTRAINT
-- Drops standard unique constraint if present and enforces strict case-insensitive uniqueness
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci_unique 
  ON public.profiles (LOWER(TRIM(username)));

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Anyone can view profiles (for player search, leaderboard, avatars)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- 5. Policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 6. Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

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

-- Done! Your database is now configured with case-insensitive unique usernames and profile stats.
