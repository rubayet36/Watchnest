-- WatchNest feature and feed optimization migration
-- Run in Supabase SQL Editor after the base schema, features, replies, and partners migrations.

-- Spoiler-safe recommendation metadata
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS contains_spoilers BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS mood_tags TEXT[] DEFAULT '{}' NOT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_rating NUMERIC(3,1);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS why_watch TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_user_rating_check'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_user_rating_check
      CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10));
  END IF;
END $$;

-- Web Push subscriptions for PWA device notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Users can view own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view own push subscriptions"
      ON public.push_subscriptions FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Users can insert own push subscriptions'
  ) THEN
    CREATE POLICY "Users can insert own push subscriptions"
      ON public.push_subscriptions FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Users can update own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update own push subscriptions"
      ON public.push_subscriptions FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Users can delete own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own push subscriptions"
      ON public.push_subscriptions FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Keep notification checks aligned with threaded replies.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow_request', 'share', 'reaction', 'review', 'comment', 'reply'));

-- Stronger runtime indexes
CREATE INDEX IF NOT EXISTS idx_posts_media_tmdb_created
  ON public.posts (media_type, tmdb_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_genres_gin
  ON public.posts USING GIN (genres);

CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
  ON public.comments (post_id, parent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower_status
  ON public.follows (follower_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_following_status
  ON public.follows (following_id, status);

-- Feed RPC: dedupe by media_type + tmdb_id in SQL and return aggregated social context.
CREATE OR REPLACE FUNCTION public.get_feed_v2(
  p_viewer_id UUID DEFAULT auth.uid(),
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 20,
  p_genre TEXT DEFAULT NULL,
  p_user_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tmdb_id INTEGER,
  title TEXT,
  poster_path TEXT,
  genres TEXT[],
  tmdb_rating NUMERIC,
  release_year INTEGER,
  category TEXT,
  personal_note TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  media_type TEXT,
  contains_spoilers BOOLEAN,
  mood_tags TEXT[],
  user_rating NUMERIC,
  why_watch TEXT,
  profiles JSONB,
  reactions JSONB,
  saves JSONB,
  reaction_counts JSONB,
  recommended_by JSONB,
  all_notes JSONB,
  recommender_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH filtered AS (
    SELECT p.*
    FROM public.posts p
    WHERE (p_genre IS NULL OR p.genres @> ARRAY[p_genre]::TEXT[])
      AND (p_user_filter IS NULL OR p.user_id = p_user_filter)
  ),
  ranked AS (
    SELECT
      f.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(f.media_type, 'movie'), f.tmdb_id
        ORDER BY f.created_at DESC
      ) AS rn
    FROM filtered f
  ),
  social AS (
    SELECT
      COALESCE(f.media_type, 'movie') AS media_type_key,
      f.tmdb_id,
      COUNT(DISTINCT f.user_id)::INTEGER AS recommender_count,
      COALESCE(
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', pr.id,
            'name', pr.name,
            'avatar_url', pr.avatar_url,
            'username', pr.username,
            'postedAt', f.created_at,
            'postId', f.id
          )
        ) FILTER (WHERE pr.id IS NOT NULL),
        '[]'::JSONB
      ) AS recommended_by,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'note', f.personal_note,
            'user', JSONB_BUILD_OBJECT(
              'id', pr.id,
              'name', pr.name,
              'avatar_url', pr.avatar_url,
              'username', pr.username
            ),
            'postedAt', f.created_at,
            'postId', f.id,
            'contains_spoilers', f.contains_spoilers,
            'mood_tags', f.mood_tags,
            'user_rating', f.user_rating,
            'why_watch', f.why_watch
          )
          ORDER BY f.created_at DESC
        ) FILTER (
          WHERE (f.personal_note IS NOT NULL AND LENGTH(BTRIM(f.personal_note)) > 0)
             OR f.why_watch IS NOT NULL
             OR f.user_rating IS NOT NULL
             OR COALESCE(ARRAY_LENGTH(f.mood_tags, 1), 0) > 0
        ),
        '[]'::JSONB
      ) AS all_notes
    FROM filtered f
    LEFT JOIN public.profiles pr ON pr.id = f.user_id
    GROUP BY COALESCE(f.media_type, 'movie'), f.tmdb_id
  ),
  reaction_totals AS (
    SELECT
      r.post_id,
      JSONB_OBJECT_AGG(r.reaction_type, r.count) AS counts
    FROM (
      SELECT post_id, reaction_type, COUNT(*)::INTEGER AS count
      FROM public.reactions
      GROUP BY post_id, reaction_type
    ) r
    GROUP BY r.post_id
  )
  SELECT
    r.id,
    r.tmdb_id,
    r.title,
    r.poster_path,
    r.genres,
    r.tmdb_rating,
    r.release_year,
    r.category,
    r.personal_note,
    r.created_at,
    r.user_id,
    COALESCE(r.media_type, 'movie') AS media_type,
    r.contains_spoilers,
    r.mood_tags,
    r.user_rating,
    r.why_watch,
    JSONB_BUILD_OBJECT(
      'id', pr.id,
      'name', pr.name,
      'avatar_url', pr.avatar_url,
      'username', pr.username
    ) AS profiles,
    COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT('reaction_type', rx.reaction_type, 'user_id', rx.user_id))
      FROM public.reactions rx
      WHERE rx.post_id = r.id
    ), '[]'::JSONB) AS reactions,
    CASE
      WHEN p_viewer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.saves s
        WHERE s.post_id = r.id
          AND s.user_id = p_viewer_id
      )
      THEN JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('user_id', p_viewer_id))
      ELSE '[]'::JSONB
    END AS saves,
    COALESCE(rt.counts, '{}'::JSONB) AS reaction_counts,
    COALESCE(social.recommended_by, '[]'::JSONB) AS recommended_by,
    COALESCE(social.all_notes, '[]'::JSONB) AS all_notes,
    COALESCE(social.recommender_count, 1) AS recommender_count
  FROM ranked r
  LEFT JOIN public.profiles pr ON pr.id = r.user_id
  LEFT JOIN social
    ON social.media_type_key = COALESCE(r.media_type, 'movie')
   AND social.tmdb_id = r.tmdb_id
  LEFT JOIN reaction_totals rt ON rt.post_id = r.id
  WHERE r.rn = 1
  ORDER BY r.created_at DESC
  OFFSET GREATEST(p_page, 0) * LEAST(GREATEST(p_page_size, 1), 50)
  LIMIT LEAST(GREATEST(p_page_size, 1), 50) + 1;
$$;
