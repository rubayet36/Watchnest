'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchProfile(userId) {
  const res  = await fetch(`/api/profile/${userId}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Profile load failed')
  return json // { profile, posts }
}

async function fetchWatchlist() {
  const res  = await fetch('/api/watchlist')
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Watchlist load failed')
  return json.movies || []
}

export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn:  () => fetchProfile(userId).then(d => d.profile),
    enabled:  !!userId,
    staleTime: 60_000,
  })
}

export function useUserPosts(userId) {
  return useQuery({
    queryKey: ['userPosts', userId],
    queryFn:  () => fetchProfile(userId).then(d => d.posts || []),
    enabled:  !!userId,
    staleTime: 30_000,
  })
}

export function useWatchlistQuery() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn:  fetchWatchlist,
    staleTime: 30_000,
  })
}
