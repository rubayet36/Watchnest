-- Performance Indexes for WatchNest
-- Run this in your Supabase SQL Editor

-- 1. Index for fetching feeds/posts sorted by time
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- 2. Index for sorting search results by rating
CREATE INDEX IF NOT EXISTS idx_posts_tmdb_rating ON public.posts(tmdb_rating DESC);

-- 3. Index for fetching comments for a specific post instantly
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);

-- 4. Index for full-text search on post titles
-- This creates a GIN index which makes textSearch() instantaneous even on 100k+ rows
CREATE INDEX IF NOT EXISTS idx_posts_title_search ON public.posts USING GIN (to_tsvector('english', title));

-- 5. Feed dedupe and movie-detail lookup
CREATE INDEX IF NOT EXISTS idx_posts_media_tmdb_created
  ON public.posts (media_type, tmdb_id, created_at DESC);

-- 6. Genre filtering
CREATE INDEX IF NOT EXISTS idx_posts_genres_gin
  ON public.posts USING GIN (genres);

-- 7. Threaded comments
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
  ON public.comments (post_id, parent_id, created_at);

-- 8. Notification inbox reads
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);

-- 9. Partner/follow status lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower_status
  ON public.follows (follower_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_following_status
  ON public.follows (following_id, status);
