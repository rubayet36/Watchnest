-- ============================================================
-- WatchNest — Replies Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ============================================================

-- Add parent_id to comments (self-referencing FK for replies)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments(parent_id);

-- Update notifications CHECK to include 'reply' type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow_request', 'share', 'reaction', 'review', 'comment', 'reply'));

-- ✅ Done!
