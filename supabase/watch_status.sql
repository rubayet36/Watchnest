-- ============================================================
-- WatchNest — Watch Status & RLS Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ============================================================

-- 1. Add watched boolean column to saves if it does not exist
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS watched BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Add watch_status column with constraint to saves if it does not exist
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS watch_status TEXT DEFAULT 'queued';

-- 3. Drop existing constraint if it exists to prevent conflict, and recreate it
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_watch_status_check;
ALTER TABLE public.saves ADD CONSTRAINT saves_watch_status_check CHECK (watch_status IN ('queued', 'watching', 'watched', 'left-out'));

-- 4. Enable Row Level Security on the saves table
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing saves update policy if it exists and recreate it to be bulletproof
DROP POLICY IF EXISTS "Users can update own saves" ON public.saves;
CREATE POLICY "Users can update own saves"
  ON public.saves FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
