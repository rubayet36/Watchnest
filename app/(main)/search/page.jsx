'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import Link from 'next/link'
import { Search, X, Star, Plus, TrendingUp, Trophy } from 'lucide-react'
import { getPosterUrl, getTrending } from '@/lib/tmdb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

const AddMovieModal = dynamic(() => import('@/components/movie/AddMovieModal'), { ssr: false })

// ── Nest: search by query ─────────────────────────────────────
async function searchNest(term) {
  const res  = await fetch(term ? `/api/search?q=${encodeURIComponent(term)}` : '/api/search')
  const json = await res.json()
  return json.results || []
}

// ── TMDB: weekly trending ─────────────────────────────────────
async function fetchTrending() {
  return getTrending()
}

// ── Shared result row renderer ────────────────────────────────
function ResultRow({ movie, searchMode, index, onAdd }) {
  let isAnime = false
  if (searchMode === 'tmdb') {
    isAnime = movie.genre_ids?.includes(16) && movie.media_type === 'tv'
  } else {
    isAnime = movie.genres?.includes('Animation') && movie.media_type === 'tv'
  }
  const mediaLabel = isAnime ? 'ANIME' : (movie.media_type === 'tv' ? 'TV' : 'MOVIE')
  const mediaColor = isAnime ? '#ec4899' : (movie.media_type === 'tv' ? '#3b82f6' : '#10b981')
  const rating = movie.tmdb_rating ?? movie.vote_average
  // Genres: nest stores string[], TMDB stores {id,name}[] via genre_ids (names not available directly)
  const genreNames = Array.isArray(movie.genres)
    ? movie.genres.slice(0, 3).map(g => (typeof g === 'string' ? g : g.name))
    : []

  return (
    <motion.div
      key={movie.tmdb_id || movie.id || index}
      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.035 }}
      style={{ position: 'relative' }}
    >
      <Link
        href={`/media/${movie.media_type || 'movie'}/${movie.tmdb_id || movie.id}`}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div className="surface-row" style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem',
          paddingRight: searchMode === 'tmdb' ? '3.5rem' : '0.875rem',
        }}
        >
          {/* Poster */}
          <div style={{ width: 56, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1c1c2e' }}>
            <PosterImage src={getPosterUrl(movie.poster_path)} alt={movie.title || movie.name}
              fill sizes="56px" style={{ objectFit: 'cover' }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {movie.title || movie.name}
              <span style={{ marginLeft: 8, fontSize: '0.65rem', padding: '2px 5px', background: `${mediaColor}22`, color: mediaColor, border: `1px solid ${mediaColor}44`, borderRadius: 4, verticalAlign: 'middle' }}>
                {mediaLabel}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 4, fontSize: '0.8125rem', color: '#64748b' }}>
              <span>{movie.release_year || movie.release_date?.split('-')[0]}</span>
              {rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                  <Star size={12} fill="#f59e0b" />
                  {Number(rating).toFixed(1)}
                </span>
              )}
            </div>
            {genreNames.length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: 6, flexWrap: 'wrap' }}>
                {genreNames.map((g, gi) => (
                  <span key={`${g}-${gi}`} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{g}</span>
                ))}
              </div>
            )}
            {movie.profiles && searchMode === 'nest' && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#7c3aed' }}>
                Added by {movie.profiles.name}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Add to Nest button — TMDB mode only */}
      {searchMode === 'tmdb' && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd(movie) }}
          title="Add to WatchNest"
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.45)', transition: 'transform .15s, box-shadow .15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-50%) scale(1.12)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(124,58,237,0.65)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(-50%) scale(1)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(124,58,237,0.45)' }}
        >
          <Plus size={18} color="white" />
        </button>
      )}
    </motion.div>
  )
}

// ── Main search component ─────────────────────────────────────
function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialMode  = searchParams.get('mode') === 'tmdb' ? 'tmdb' : 'nest'
  const initialQuery = searchParams.get('q') || ''

  const [input, setInput]           = useState(initialQuery)
  const [searchMode, setSearchMode] = useState(initialMode)
  const [addingMovie, setAddingMovie] = useState(null)

  const {
    results: tmdbSearchResults,
    loading: tmdbSearchLoading,
    error: tmdbSearchError,
    search: tmdbSearch,
    clear,
  } = useMovieSearch()

  // Restore TMDB search on back-navigation
  const didInitRef = useRef(false)
  useEffect(() => {
    if (!didInitRef.current && initialMode === 'tmdb' && initialQuery.length >= 2) {
      tmdbSearch(initialQuery)
    }
    didInitRef.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateUrl(mode, q) {
    const params = new URLSearchParams()
    if (mode) params.set('mode', mode)
    if (q)    params.set('q', q)
    router.replace(`/search${params.toString() ? `?${params}` : ''}`, { scroll: false })
  }

  function handleInput(value) {
    setInput(value)
    updateUrl(searchMode, value)
    if (searchMode === 'tmdb') tmdbSearch(value)
  }

  function handleModeChange(mode) {
    setSearchMode(mode)
    setInput('')
    clear()
    updateUrl(mode, '')
  }

  const isTyping = input.length >= 2

  // ── Nest: top-rated default + search results ──────────────
  const { data: nestResults, isLoading: nestLoading } = useQuery({
    queryKey: ['nestSearch', input],
    queryFn: () => searchNest(input),
    // always enabled for nest — shows top-rated when no query
    enabled: searchMode === 'nest',
    staleTime: 30_000,
  })

  // ── TMDB: trending default (when no query typed) ──────────
  const { data: trendingResults, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ['tmdbTrending'],
    queryFn: fetchTrending,
    enabled: searchMode === 'tmdb' && !isTyping,
    staleTime: 600_000,   // cache 10 min
  })

  // Resolve what to display
  let displayResults, isLoading, sectionTitle, SectionIcon, displayError

  if (searchMode === 'nest') {
    displayResults = nestResults
    isLoading      = nestLoading
    sectionTitle   = isTyping ? `Results in WatchNest` : '⭐ Highest Rated in your Nest'
    SectionIcon    = Trophy
  } else {
    if (isTyping) {
      displayResults = tmdbSearchResults
      isLoading      = tmdbSearchLoading
      displayError   = tmdbSearchError
      sectionTitle   = 'Search Results'
      SectionIcon    = Search
    } else {
      displayResults = trendingResults
      isLoading      = trendingLoading
      displayError   = trendingError?.message
      sectionTitle   = '🔥 Trending This Week'
      SectionIcon    = TrendingUp
    }
  }

  return (
    <div className="page-shell mobile-safe-bottom">

      {/* Title */}
      <header className="page-header">
        <div>
          <p className="page-kicker">Explore</p>
          <h1 className="page-title gradient-text">Search</h1>
          <p className="page-subtitle">Find what is already in your nest or add something new.</p>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="chip-row" style={{ marginBottom: '1rem' }}>
        {[
          { id: 'nest', label: 'In WatchNest' },
          { id: 'tmdb', label: 'All Movies (TMDB)' },
        ].map(({ id, label }) => {
          const active = searchMode === id
          return (
            <button key={id} onClick={() => handleModeChange(id)} className={`chip ${active ? 'chip-active' : ''}`}>{label}</button>
          )
        })}
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        <input
          type="text"
          value={input}
          onChange={e => handleInput(e.target.value)}
          placeholder={searchMode === 'nest' ? 'Search movies in your nest…' : 'Search any movie or show…'}
          className="input"
          style={{ boxSizing: 'border-box', paddingLeft: 44, paddingRight: input ? 44 : 16, fontSize: '1rem' }}
        />
        {input && !isLoading && (
          <button onClick={() => { setInput(''); clear(); updateUrl(searchMode, '') }} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
          }}><X size={18} /></button>
        )}
        {isLoading && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {sectionTitle}
        </p>
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : displayError ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>ðŸ“¡</div>
          <p style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>
            TMDB search is unavailable.
          </p>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            {displayError}
          </p>
        </div>
      ) : !displayResults || displayResults.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {isTyping ? '🎭' : (searchMode === 'nest' ? '🪺' : '📡')}
          </div>
          <p style={{ color: '#64748b' }}>
            {isTyping
              ? `No results for "${input}"`
              : searchMode === 'nest'
                ? 'Your nest is empty — add some movies!'
                : 'Could not load trending. Check your connection.'
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayResults.map((movie, i) => (
            <ResultRow
              key={movie.tmdb_id || movie.id || i}
              movie={movie}
              searchMode={searchMode}
              index={i}
              onAdd={setAddingMovie}
            />
          ))}
        </div>
      )}

      {/* Quick-add modal */}
      <AnimatePresence>
        {addingMovie && (
          <AddMovieModal
            initialMovie={addingMovie}
            onClose={() => setAddingMovie(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
