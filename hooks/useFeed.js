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
  return useInfiniteQuery({
    queryKey:         ['feed', genreFilter, userFilter],
    queryFn:          ({ pageParam }) => fetchFeedPage({ pageParam, genreFilter, userFilter }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime:        30_000,
  })
}
