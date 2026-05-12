-- ============================================================
-- WatchNest — FINAL FIX SQL (updated with correct categories)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ============================================================

-- ─── Step 1: Drop wrong FKs ──────────────────────────────────
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_user_id_fkey;
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_post_id_fkey;

-- ─── Step 2: Drop unused tables ──────────────────────────────
DROP TABLE IF EXISTS public.users CASCADE;

-- ─── Step 3: Fix posts column defaults ───────────────────────
ALTER TABLE public.posts ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN category SET DEFAULT 'all-time-fav';

-- ─── Step 4: Add correct category CHECK constraint ───────────
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
  CHECK (category IN (
    'all-time-fav',
    'made-me-cry',
    'best-comedy',
    'mind-blowing',
    'watch-family',
    'best-thriller',
    'best-horror',
    'must-watch',
    'hidden-gem',
    'best-scifi',
    'date-movie',
    'underrated',
    'rewatchable'
  ));

-- ─── Step 5: Reconnect posts → profiles ──────────────────────
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ─── Step 6: Reconnect saves → profiles & posts ──────────────
ALTER TABLE public.saves ADD CONSTRAINT saves_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─── Step 7: Enable RLS everywhere ───────────────────────────
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves      ENABLE ROW LEVEL SECURITY;

-- ─── Step 8: Profiles RLS ────────────────────────────────────
DROP POLICY IF EXISTS "Profiles viewable by all auth users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"        ON public.profiles;
CREATE POLICY "Profiles viewable by all auth users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"        ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"        ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ─── Step 9: Posts RLS ───────────────────────────────────────
DROP POLICY IF EXISTS "Posts viewable by all auth users" ON public.posts;
DROP POLICY IF EXISTS "Users can insert own posts"       ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts"       ON public.posts;
CREATE POLICY "Posts viewable by all auth users" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own posts"       ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"       ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── Step 10: Saves RLS ──────────────────────────────────────
DROP POLICY IF EXISTS "Saves viewable by owner" ON public.saves;
DROP POLICY IF EXISTS "Users can save posts"    ON public.saves;
DROP POLICY IF EXISTS "Users can unsave posts"  ON public.saves;
CREATE POLICY "Saves viewable by owner" ON public.saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts"    ON public.saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts"  ON public.saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── Step 11: Reactions RLS ──────────────────────────────────
DROP POLICY IF EXISTS "Reactions viewable by all" ON public.reactions;
DROP POLICY IF EXISTS "Users can insert reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.reactions;
CREATE POLICY "Reactions viewable by all"       ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reactions"      ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions"  ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── Step 12: Auto-create profile trigger ────────────────────
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
    avatar_url = EXCLUDED.avatar_url,
    email      = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Step 13: Sync all existing auth users → profiles ────────
INSERT INTO public.profiles (id, email, name, username, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  split_part(email, '@', 1),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  email      = EXCLUDED.email;

-- ✅ Done! All users are synced, categories are correct, FKs are fixed.
-- Try adding a movie now — it should work!
