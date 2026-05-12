-- ============================================================
-- WatchNest — Database Fix SQL
-- Run this in Supabase SQL Editor to fix foreign key issues
-- ============================================================

-- Fix 1: posts.user_id should reference profiles, not users
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix 2: saves.user_id should reference profiles, not users
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_user_id_fkey;
ALTER TABLE public.saves ADD CONSTRAINT saves_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Fix 3: reactions.user_id should also reference profiles
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;
ALTER TABLE public.reactions ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix 4: likes cleanup (we use reactions, not likes)
DROP TABLE IF EXISTS public.likes CASCADE;

-- Fix 5: Add missing indexes
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_tmdb_id_idx    ON public.posts(tmdb_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx    ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS saves_user_id_idx    ON public.saves(user_id);

-- Fix 6: Enable RLS on all tables
ALTER TABLE public.posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;

-- Fix 7: RLS Policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                 ON public.profiles;
CREATE POLICY "Profiles viewable by all auth users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"        ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"        ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Fix 8: RLS Policies for posts
DROP POLICY IF EXISTS "Posts viewable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Users can insert own posts"           ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts"           ON public.posts;
CREATE POLICY "Posts viewable by all auth users" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own posts"       ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"       ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix 9: RLS for saves
DROP POLICY IF EXISTS "Saves viewable by owner" ON public.saves;
DROP POLICY IF EXISTS "Users can save posts"    ON public.saves;
DROP POLICY IF EXISTS "Users can unsave posts"  ON public.saves;
CREATE POLICY "Saves viewable by owner" ON public.saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts"    ON public.saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts"  ON public.saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix 10: RLS for reactions
DROP POLICY IF EXISTS "Reactions viewable by authenticated" ON public.reactions;
DROP POLICY IF EXISTS "Users can insert reactions"          ON public.reactions;
DROP POLICY IF EXISTS "Users can delete own reactions"      ON public.reactions;
CREATE POLICY "Reactions viewable by all" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reactions" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix 11: Auto-create profile trigger on Google login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ✅ Done! Your WatchNest database is now fixed.
