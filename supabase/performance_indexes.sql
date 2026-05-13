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
