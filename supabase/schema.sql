-- ============================================================
-- WatchNest — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  username    TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ─── 2. POSTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tmdb_id       INTEGER NOT NULL,
  title         TEXT NOT NULL,
  poster_path   TEXT,
  genres        TEXT[] DEFAULT '{}',
  tmdb_rating   NUMERIC(4,2),
  release_year  INTEGER,
  category      TEXT NOT NULL,
  personal_note TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_tmdb_id_idx    ON public.posts(tmdb_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx    ON public.posts(user_id);

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated users"
  ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 3. REACTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love','haha','wow','sad','fire','cinema')),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON public.reactions(post_id);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions viewable by authenticated"
  ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reactions"
  ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions"
  ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 4. SAVES (WATCHLIST) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saves (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS saves_user_id_idx ON public.saves(user_id);

ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saves viewable by owner"
  ON public.saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts"
  ON public.saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts"
  ON public.saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 5. AUTO-CREATE PROFILE TRIGGER ──────────────────────────
-- This creates a profile row automatically when a new user signs up via Google
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
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── DONE ────────────────────────────────────────────────────
-- Your WatchNest database is ready! 🎬
