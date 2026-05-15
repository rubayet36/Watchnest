'use client'

import { useEffect, useRef } from 'react'

export function useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage) {
  const sentinelRef = useRef(null)
  const fetchLockRef = useRef(false)

  useEffect(() => {
    if (!isFetchingNextPage) fetchLockRef.current = false
  }, [isFetchingNextPage])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !fetchLockRef.current) {
          fetchLockRef.current = true
          Promise.resolve(fetchNextPage()).finally(() => {
            fetchLockRef.current = false
          })
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return sentinelRef
}
