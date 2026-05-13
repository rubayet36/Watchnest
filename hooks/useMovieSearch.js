'use client'

import { useState, useCallback, useRef } from 'react'
import { searchMulti } from '@/lib/tmdb'

export function useMovieSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  const search = useCallback((value) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value || value.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchMulti(value)
        setResults(data.slice(0, 8))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return { query, results, loading, error, search, clear }
}
