'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 10

async function fetchFeedPage({ pageParam = 0, genreFilter, userFilter }) {
  const supabase = createClient()
  const from = pageParam * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('posts')
    .select(`
      id, tmdb_id, title, poster_path, genres, tmdb_rating,
      release_year, category, personal_note, created_at,
      profiles:user_id ( id, name, avatar_url, username ),
      reactions ( reaction_type, user_id ),
      saves ( user_id )
    `)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (genreFilter) query = query.contains('genres', [genreFilter])
  if (userFilter) query = query.eq('user_id', userFilter)

  const { data, error } = await query
  if (error) throw error

  // Merge posts with same tmdb_id
  const merged = {}
  for (const post of data) {
    if (!merged[post.tmdb_id]) {
      merged[post.tmdb_id] = { ...post, allNotes: [] }
    }
    if (post.personal_note) {
      merged[post.tmdb_id].allNotes.push({
        note: post.personal_note,
        user: post.profiles,
        postedAt: post.created_at,
        postId: post.id,
      })
    }
    // Keep most recent as main
    if (new Date(post.created_at) > new Date(merged[post.tmdb_id].created_at)) {
      merged[post.tmdb_id] = { ...merged[post.tmdb_id], ...post, allNotes: merged[post.tmdb_id].allNotes }
    }
  }

  return { posts: Object.values(merged), nextPage: data.length === PAGE_SIZE ? pageParam + 1 : null }
}

export function useFeed({ genreFilter, userFilter } = {}) {
  return useInfiniteQuery({
    queryKey: ['feed', genreFilter, userFilter],
    queryFn: ({ pageParam }) => fetchFeedPage({ pageParam, genreFilter, userFilter }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30_000,
  })
}
