-- =============================================================
-- WatchNest: Email Auth Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1.  Make sure the profiles table exists with the right columns
--     (safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  name        text,
  username    text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Add any missing columns if the table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────
-- 2.  Row-Level Security  (skip if already enabled)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (needed for feeds, search, etc.)
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- A user can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 3.  Auto-create profile on new user signup (email OR Google)
--
--     This trigger fires whenever a row is inserted into auth.users,
--     which happens on:
--       • email/password signUp
--       • Google OAuth (first sign-in)
--       • Magic-link sign-up
--
--     It reads user_metadata so the name set during signUp
--     (data: { full_name: name }) is stored immediately.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    split_part(NEW.email, '@', 1),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: don't overwrite existing profiles
  RETURN NEW;
END;
$$;

-- Attach the trigger (drop first so re-running is safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 4.  (Optional) Enable email confirmations
--
--     By default Supabase requires email confirmation for new
--     sign-ups.  To disable it for local development:
--
--     Dashboard → Authentication → Providers → Email
--     → Uncheck "Confirm email"
--
--     For production, leave it ON and make sure you have a
--     custom SMTP configured in Supabase Dashboard →
--     Authentication → SMTP Settings.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 5.  Backfill existing users (if profiles table was already
--     populated, this is a no-op due to ON CONFLICT DO NOTHING)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, name, username, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  split_part(u.email, '@', 1),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
