-- ============================================================
-- WatchNest — Watch Status Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ============================================================

-- Add watch_status to saves table
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS watch_status TEXT DEFAULT 'queued' CHECK (watch_status IN ('queued', 'watching', 'watched', 'left-out'));
