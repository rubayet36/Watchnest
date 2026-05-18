'use client'

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

const PAGE_SIZE = 10

async function fetchFeedPage({ pageParam = 0, genreFilter, userFilter, mediaFilter }) {
  const params = new URLSearchParams({ page: pageParam })
  if (genreFilter) params.set('genre', genreFilter)
  if (userFilter)  params.set('user', userFilter)
  if (mediaFilter) params.set('media', mediaFilter)

  const res  = await fetch(`/api/feed?${params}`)
  const json = await res.json()

  if (!res.ok) throw new Error(json.error || 'Failed to load feed')
  return { posts: json.posts || [], nextPage: json.nextPage ?? null }
}

export function useFeed({ genreFilter, userFilter, mediaFilter } = {}) {
  const cacheKey = `feed_cache_${genreFilter||'all'}_${userFilter||'all'}_${mediaFilter||'all'}`
  const queryKey = useMemo(() => ['feed', genreFilter, userFilter, mediaFilter], [genreFilter, userFilter, mediaFilter])
  const queryClient = useQueryClient()

  // Hydration-safe cache injection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey)
        const currentData = queryClient.getQueryData(queryKey)
        if (cached && !currentData) {
          queryClient.setQueryData(queryKey, { pages: [JSON.parse(cached)], pageParams: [0] })
          queryClient.invalidateQueries({ queryKey })
        }
      } catch(e) {}
    }
  }, [cacheKey, queryClient, queryKey])

  return useInfiniteQuery({
    queryKey,
    queryFn:          async ({ pageParam }) => {
      const data = await fetchFeedPage({ pageParam, genreFilter, userFilter, mediaFilter })
      // Cache the first page to localStorage for instant load on refresh
      if (pageParam === 0 && typeof window !== 'undefined') {
        try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch(e){}
      }
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime:        60_000, // 1 minute
  })
}
