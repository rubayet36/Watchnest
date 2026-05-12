'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

async function fetchProfile(userId) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

async function fetchUserPosts(userId) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, tmdb_id, title, poster_path, genres, tmdb_rating,
      release_year, category, personal_note, created_at,
      reactions ( reaction_type, user_id ),
      saves ( user_id )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function fetchWatchlist(userId) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saves')
    .select(`
      id, created_at,
      posts ( id, tmdb_id, title, poster_path, genres, tmdb_rating, release_year, category, personal_note,
        profiles:user_id ( id, name, avatar_url, username ) )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(s => s.posts).filter(Boolean)
}

export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useUserPosts(userId) {
  return useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useWatchlistQuery(userId) {
  return useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => fetchWatchlist(userId),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
