'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import Link from 'next/link'
import { Search, X, Star, Plus, TrendingUp, Trophy, Bookmark, BookmarkCheck, Play } from 'lucide-react'
import { getPosterUrl, getTrending, getBackdropUrl, getMoviesByGenre } from '@/lib/tmdb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useDirectWatchlist } from '@/hooks/useReactions'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

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
function ResultRow({ movie, searchMode, index, onAdd, watchlist }) {
  const { toggleDirect, isDirectToggling } = useDirectWatchlist()
  
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

  const targetId = String(movie.tmdb_id || movie.id)
  const targetType = movie.media_type || 'movie'
  const isSaved = watchlist?.some(
    m => String(m.tmdb_id) === targetId && String(m.media_type) === targetType
  )

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
          paddingRight: searchMode === 'tmdb' ? '6.25rem' : '0.875rem',
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

      {/* Action buttons — TMDB mode only */}
      {searchMode === 'tmdb' && (
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: '8px', alignItems: 'center', zIndex: 5
        }}>
          {/* Direct Watchlist Button */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleDirect(movie) }}
            title={isSaved ? "Remove from Watchlist" : "Add directly to Watchlist"}
            disabled={isDirectToggling}
            style={{
              width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s ease', flexShrink: 0,
              border: isSaved ? 'none' : '1px solid rgba(255,255,255,0.08)',
              background: isSaved 
                ? 'linear-gradient(135deg,#10b981,#06b6d4)' // Premium emerald-to-cyan gradient
                : 'rgba(255,255,255,0.06)',                 // Inactive glassmorphic background
              boxShadow: isSaved 
                ? '0 4px 16px rgba(16,185,129,0.45)' 
                : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.12)';
              if (isSaved) {
                e.currentTarget.style.boxShadow = '0 6px 22px rgba(16,185,129,0.65)';
              } else {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              if (isSaved) {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.45)';
              } else {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
              }
            }}
          >
            {isDirectToggling ? (
              <LoadingSpinner size="sm" />
            ) : isSaved ? (
              <BookmarkCheck size={18} color="white" />
            ) : (
              <Bookmark size={18} color="#94a3b8" />
            )}
          </button>

          {/* Add to Nest button */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd(movie) }}
            title="Add to WatchNest with Details"
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(124,58,237,0.45)', transition: 'all .2s ease', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.12)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(124,58,237,0.65)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(124,58,237,0.45)' }}
          >
            <Plus size={18} color="white" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function NetflixDiscovery({ watchlist, onAdd }) {
  const { toggleDirect, isDirectToggling } = useDirectWatchlist()
  const [heroIndex, setHeroIndex] = useState(0)

  const { data: netflixData, isLoading, error } = useQuery({
    queryKey: ['netflixDiscovery'],
    queryFn: async () => {
      const [trending, tvPopular, actionMovies, scifiMovies] = await Promise.all([
        getTrending(1),
        fetch('/api/tmdb/tv/popular').then(r => r.json()).then(d => (d.results || []).map(x => ({ ...x, media_type: 'tv' }))),
        getMoviesByGenre(28).then(d => (d.results || []).map(x => ({ ...x, media_type: 'movie' }))),
        getMoviesByGenre(878).then(d => (d.results || []).map(x => ({ ...x, media_type: 'movie' }))),
      ])
      
      const anime = [
        ...trending.filter(m => m.genre_ids?.includes(16)),
        ...tvPopular.filter(m => m.genre_ids?.includes(16))
      ]
      
      return {
        trending,
        tvPopular: tvPopular.slice(0, 15),
        action: actionMovies.slice(0, 15),
        scifi: scifiMovies.slice(0, 15),
        anime: anime.length > 0 ? anime.slice(0, 15) : tvPopular.slice(0, 15),
      }
    },
    staleTime: 600_000,
  })

  useEffect(() => {
    if (!netflixData?.trending?.length) return
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(netflixData.trending.length, 6))
    }, 7000)
    return () => clearInterval(interval)
  }, [netflixData?.trending])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
        <div style={{ height: 260, borderRadius: 20 }} className="shimmer" />
        <div>
          <div style={{ width: 140, height: 20, marginBottom: 12, borderRadius: 4 }} className="shimmer" />
          <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
            <div style={{ width: 110, height: 165, borderRadius: 12, flexShrink: 0 }} className="shimmer" />
            <div style={{ width: 110, height: 165, borderRadius: 12, flexShrink: 0 }} className="shimmer" />
            <div style={{ width: 110, height: 165, borderRadius: 12, flexShrink: 0 }} className="shimmer" />
            <div style={{ width: 110, height: 165, borderRadius: 12, flexShrink: 0 }} className="shimmer" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !netflixData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
        <p style={{ fontSize: '3rem' }}>📡</p>
        <p>Could not load discovery feed. Please check your connection.</p>
      </div>
    )
  }

  // Get current rotating hero movie
  const heroMovie = netflixData.trending?.[heroIndex] || netflixData.trending?.[0]

  const isHeroSaved = heroMovie && watchlist?.some(
    m => String(m.tmdb_id) === String(heroMovie.id || heroMovie.tmdb_id) && 
         String(m.media_type) === String(heroMovie.media_type || 'movie')
  )

  const rows = [
    { title: '🔥 Trending This Week', items: netflixData.trending },
    { title: '📺 Popular TV Shows', items: netflixData.tvPopular },
    { title: '🌸 Anime & Animation Hits', items: netflixData.anime },
    { title: '💥 Action & Adventure', items: netflixData.action },
    { title: '🛸 Sci-Fi & Fantasy', items: netflixData.scifi },
  ]

  function NetflixCard({ movie }) {
    const targetId = String(movie.id || movie.tmdb_id)
    const targetType = movie.media_type || 'movie'
    const isSaved = watchlist?.some(
      m => String(m.tmdb_id) === targetId && String(m.media_type) === targetType
    )

    return (
      <div
        className="netflix-card"
        style={{
          width: 110, flexShrink: 0, position: 'relative', borderRadius: 12,
          overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          aspectRatio: '2/3', background: '#1c1c2e'
        }}
      >
        <Link href={`/media/${targetType}/${targetId}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <PosterImage src={getPosterUrl(movie.poster_path)} alt={movie.title || movie.name} fill sizes="110px" style={{ objectFit: 'cover' }} />
        </Link>
        
        {/* Quick Hover Controls Overlay */}
        <div className="netflix-card-overlay" style={{
          position: 'absolute', inset: 0, background: 'rgba(9,9,14,0.85)',
          opacity: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          transition: 'all 0.25s ease', zIndex: 10
        }}>
          {/* Direct watchlist toggle button */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleDirect(movie) }}
            disabled={isDirectToggling}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: isSaved ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'rgba(255,255,255,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isSaved ? '0 4px 12px rgba(16,185,129,0.45)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
          
          {/* Add with details button */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd(movie) }}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '0.5rem' }}>
      <style>{`
        .netflix-card:hover {
          transform: scale(1.08) translateY(-4px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.6), 0 4px 12px rgba(124,58,237,0.3);
        }
        .netflix-card:hover .netflix-card-overlay {
          opacity: 1 !important;
        }
        .netflix-row-scroller::-webkit-scrollbar {
          height: 6px;
        }
        .netflix-row-scroller::-webkit-scrollbar-track {
          background: transparent;
        }
        .netflix-row-scroller::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
        }
        .netflix-row-scroller::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>

      {/* Hero Banner */}
      {heroMovie && (
        <div style={{
          position: 'relative', height: 280, borderRadius: 24, overflow: 'hidden',
          background: '#09090e',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.4)',
        }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={heroMovie.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${getBackdropUrl(heroMovie.backdrop_path, 'w1280')})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}
            />
          </AnimatePresence>

          {/* Dark Overlay Gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, #09090e 10%, transparent 60%, rgba(9,9,14,0.6) 100%), linear-gradient(to right, rgba(9,9,14,0.9) 20%, transparent 70%)',
            zIndex: 1
          }} />

          {/* Hero Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={heroMovie.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'absolute', bottom: 20, left: 24, right: 24, zIndex: 2,
                maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '8px'
              }}
            >
              <span style={{
                alignSelf: 'flex-start', fontSize: '0.65rem', padding: '2px 6px',
                background: 'rgba(124,58,237,0.22)', color: '#c4b5fd',
                border: '1px solid rgba(124,58,237,0.4)', borderRadius: 6, fontWeight: 900
              }}>
                FEATURED TITLE
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {heroMovie.title || heroMovie.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <span style={{ color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
                  ★ {heroMovie.vote_average?.toFixed(1)}
                </span>
                <span>{heroMovie.release_date?.split('-')[0] || heroMovie.first_air_date?.split('-')[0]}</span>
                <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  {heroMovie.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                </span>
              </div>
              <p style={{
                margin: '4px 0 8px', color: '#94a3b8', fontSize: '0.78rem',
                lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {heroMovie.overview}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href={`/media/${heroMovie.media_type || 'movie'}/${heroMovie.id}`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', padding: '0.5rem 1.1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Play size={14} fill="#fff" /> View Details
                </Link>
                <button
                  onClick={() => toggleDirect(heroMovie)}
                  disabled={isDirectToggling}
                  style={{
                    padding: '0 0.85rem', borderRadius: 12, cursor: 'pointer',
                    border: isHeroSaved ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    background: isHeroSaved ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'rgba(255,255,255,0.06)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.15s'
                  }}
                >
                  {isHeroSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  <span>{isHeroSaved ? 'Watchlisted' : 'Add to List'}</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Rows */}
      {rows.map(row => (
        <div key={row.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
            {row.title}
          </h3>
          
          {/* Horizontal Scroller */}
          <div
            className="netflix-row-scroller"
            style={{
              display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px',
              paddingLeft: '2px', paddingRight: '2px'
            }}
          >
            {row.items?.map(movie => (
              <NetflixCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main search component ─────────────────────────────────────
function SearchContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const initialQuery = searchParams.get('q') || ''

  const [input, setInput] = useState(initialQuery)
  const [addingMovie, setAddingMovie] = useState(null)

  const { data: watchlist } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/watchlist')
      const json = await res.json()
      return json.movies || []
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  })

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
    if (!didInitRef.current && initialQuery.length >= 2) {
      tmdbSearch(initialQuery)
    }
    didInitRef.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateUrl(q) {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    window.history.replaceState(window.history.state, '', `/search${params.toString() ? `?${params}` : ''}`)
  }

  function handleInput(value) {
    setInput(value)
    updateUrl(value)
    if (value.length >= 2) {
      tmdbSearch(value)
    } else {
      clear()
    }
  }

  const isTyping = input.length >= 2
  const displayResults = tmdbSearchResults
  const isLoading = tmdbSearchLoading
  const displayError = tmdbSearchError?.message || tmdbSearchError
  const sectionTitle = 'Search Results'

  return (
    <div className="page-shell mobile-safe-bottom">

      {/* Spacer top */}
      <div style={{ height: '0.75rem' }} />

      {/* Search Input at Top */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        <input
          type="text"
          value={input}
          onChange={e => handleInput(e.target.value)}
          placeholder="Search any movie or show..."
          className="input"
          style={{ 
            boxSizing: 'border-box', 
            paddingLeft: 44, 
            paddingRight: input ? 44 : 16, 
            fontSize: '1rem', 
            height: '46px', 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        />
        {input && !isLoading && (
          <button onClick={() => { setInput(''); clear(); updateUrl('') }} style={{
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

      {!isTyping ? (
        <NetflixDiscovery watchlist={watchlist} onAdd={setAddingMovie} />
      ) : (
        <>
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
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📡</div>
              <p style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>
                TMDB search is unavailable.
              </p>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
                {displayError}
              </p>
            </div>
          ) : !displayResults || displayResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎭</div>
              <p style={{ color: '#64748b' }}>
                No results for "{input}"
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayResults.map((movie, i) => (
                <ResultRow
                  key={movie.tmdb_id || movie.id || i}
                  movie={movie}
                  searchMode="tmdb"
                  index={i}
                  onAdd={setAddingMovie}
                  watchlist={watchlist}
                />
              ))}
            </div>
          )}
        </>
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
