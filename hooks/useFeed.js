'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 10

async function fetchFeedPage({ pageParam = 0, genreFilter, userFilter }) {
  const params = new URLSearchParams({ page: pageParam })
  if (genreFilter) params.set('genre', genreFilter)
  if (userFilter)  params.set('user', userFilter)

  const res  = await fetch(`/api/feed?${params}`)
  const json = await res.json()

  if (!res.ok) throw new Error(json.error || 'Failed to load feed')
  return { posts: json.posts || [], nextPage: json.nextPage ?? null }
}

export function useFeed({ genreFilter, userFilter } = {}) {
  const cacheKey = `feed_cache_${genreFilter||'all'}_${userFilter||'all'}`

  return useInfiniteQuery({
    queryKey:         ['feed', genreFilter, userFilter],
    queryFn:          async ({ pageParam }) => {
      const data = await fetchFeedPage({ pageParam, genreFilter, userFilter })
      // Cache the first page to localStorage for instant load on refresh
      if (pageParam === 0 && typeof window !== 'undefined') {
        try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch(e){}
      }
      return data
    },
    initialData: () => {
      if (typeof window === 'undefined') return undefined
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          return { pages: [JSON.parse(cached)], pageParams: [0] }
        }
      } catch(e){}
      return undefined
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime:        60_000, // 1 minute
  })
}
