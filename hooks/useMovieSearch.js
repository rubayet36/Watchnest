'use client'

import { useState, useCallback, useRef } from 'react'
import { searchMulti } from '@/lib/tmdb'

const SEARCH_CACHE_KEY = 'watchnest-tmdb-search-cache'
const SEARCH_CACHE_LIMIT = 80

function readSearchCache() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(SEARCH_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeSearchCache(query, results) {
  if (typeof window === 'undefined') return
  const current = readSearchCache().filter((item) => item.query !== query)
  const next = [{ query, results, savedAt: Date.now() }, ...current].slice(0, SEARCH_CACHE_LIMIT)
  window.localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(next))
}

function searchCachedResults(query) {
  const normalized = query.trim().toLowerCase()
  const seen = new Set()
  return readSearchCache()
    .flatMap((entry) => entry.results || [])
    .filter((item) => {
      const title = (item.title || item.name || '').toLowerCase()
      const key = `${item.media_type || 'movie'}:${item.id}`
      if (!title.includes(normalized) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
}

export function useMovieSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  const search = useCallback((value) => {
    setQuery(value)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!value || value.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const trimmed = value.trim()

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setResults(searchCachedResults(trimmed))
        setLoading(false)
        setError('Offline results are from your recent searches.')
        return
      }

      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      try {
        const data = await searchMulti(trimmed, { signal: controller.signal })
        const limited = data.slice(0, 8)
        setResults(limited)
        writeSearchCache(trimmed, limited)
      } catch (e) {
        if (e.name === 'AbortError') return
        const cached = searchCachedResults(trimmed)
        setResults(cached)
        setError(cached.length > 0 ? 'Showing recent cached results.' : e.message)
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setLoading(false)
      }
    }, 400)
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  return { query, results, loading, error, search, clear }
}
