-- ============================================================
-- WatchNest — Features Migration SQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ============================================================

-- ─── 1. POSTS TABLE ─────────────────────────────────────────
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'movie';

-- ─── 2. SAVES TABLE ─────────────────────────────────────────
-- watched flag (for watchlist toggle)
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS watched   BOOLEAN DEFAULT FALSE NOT NULL;
-- shared_by (tracks who sent the movie to you)
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- Unique constraint required by the upsert in /api/share
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname    = 'saves_post_id_user_id_key'
       AND conrelid   = 'public.saves'::regclass
  ) THEN
    ALTER TABLE public.saves ADD CONSTRAINT saves_post_id_user_id_key UNIQUE (post_id, user_id);
  END IF;
END $$;

-- ⚠️  RLS: allow a user to insert a save into a PARTNER's watchlist when sharing
--     (user_id = partner, shared_by = auth.uid() — the sender)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saves' AND policyname='Users can share saves to partners') THEN
    CREATE POLICY "Users can share saves to partners"
      ON public.saves FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = shared_by);
  END IF;
END $$;


-- ─── 3. COMMENTS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES public.posts(id)    ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_post_idx ON public.comments(post_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Comments viewable by all auth users') THEN
    CREATE POLICY "Comments viewable by all auth users" ON public.comments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Users can insert own comments') THEN
    CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── 4. USER REVIEWS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS user_reviews_reviewee_idx ON public.user_reviews(reviewee_id);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_reviews' AND policyname='Reviews viewable by all auth users') THEN
    CREATE POLICY "Reviews viewable by all auth users" ON public.user_reviews FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_reviews' AND policyname='Users can insert own reviews') THEN
    CREATE POLICY "Users can insert own reviews" ON public.user_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_reviews' AND policyname='Users can update own reviews') THEN
    CREATE POLICY "Users can update own reviews" ON public.user_reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_reviews' AND policyname='Users can delete own reviews') THEN
    CREATE POLICY "Users can delete own reviews" ON public.user_reviews FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);
  END IF;
END $$;

-- ─── 5. NOTIFICATIONS TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,
  post_id     UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  read        BOOLEAN DEFAULT FALSE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Idempotent: drop & re-add the type CHECK so it includes all values
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD  CONSTRAINT notifications_type_check
  CHECK (type IN ('follow_request', 'share', 'reaction', 'review', 'comment'));

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications"   ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='System can insert notifications') THEN
    CREATE POLICY "System can insert notifications"    ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can delete own notifications') THEN
    CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ✅ Done! All features unlocked.
