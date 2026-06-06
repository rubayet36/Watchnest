'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import Link from 'next/link'
import { Search, X, Star, Plus, TrendingUp, Trophy, Bookmark, BookmarkCheck, Play, ChevronDown } from 'lucide-react'
import { getPosterUrl, getTrending, getBackdropUrl, getMoviesByGenre, TMDB_GENRES, tmdbFetch } from '@/lib/tmdb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useDirectWatchlist } from '@/hooks/useReactions'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'



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
function ResultRow({ movie, searchMode, index, watchlist }) {
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

        </div>
      )}
    </motion.div>
  )
}

function NetflixDiscovery({ watchlist, onMoreClick }) {
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

    return (
      <Link
        href={`/media/${targetType}/${targetId}`}
        className="netflix-card"
        style={{
          width: 110, flexShrink: 0, position: 'relative', borderRadius: 12,
          overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          aspectRatio: '2/3', background: '#1c1c2e', display: 'block'
        }}
      >
        <PosterImage src={getPosterUrl(movie.poster_path)} alt={movie.title || movie.name} fill sizes="110px" style={{ objectFit: 'cover' }} />
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '0.5rem' }}>
      <style>{`
        .netflix-card:hover {
          transform: scale(1.08) translateY(-4px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.6), 0 4px 12px rgba(124,58,237,0.3);
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
          border-radius: 99px;
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              {row.title}
            </h3>
            <button
              onClick={() => onMoreClick?.(row.title)}
              style={{
                padding: '0.3rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            >
              More
            </button>
          </div>
          
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

// ── Discover Grid Helpers ─────────────────────────────────────
async function fetchDiscoverGrid({ category, type, genre, year, lang, page }) {
  const currentDate = new Date().toISOString().split('T')[0]

  // Fallback to trending by default if no filters/categories are active in filter mode
  const hasFilter = Boolean(genre || year || lang)
  if (!hasFilter && !category) {
    const isTv = type === 'tv'
    const isAnime = type === 'anime'
    if (isAnime) {
      // Fall through to show animation discover grid
    } else {
      let endpoint = '/trending/all/week'
      if (isTv) endpoint = '/trending/tv/week'
      else if (type === 'movie') endpoint = '/trending/movie/week'
      
      const data = await tmdbFetch(endpoint, { page })
      return {
        results: (data.results || []).map(item => ({
          ...item,
          media_type: item.media_type || (isTv ? 'tv' : 'movie')
        })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
  }

  if (category) {
    if (category === 'trending') {
      const data = await tmdbFetch('/trending/all/week', { page })
      return {
        results: (data.results || []).map(item => ({ ...item, media_type: item.media_type || 'movie' })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
    if (category === 'tv') {
      const data = await tmdbFetch('/discover/tv', { page, sort_by: 'popularity.desc' })
      return {
        results: (data.results || []).map(item => ({ ...item, media_type: 'tv' })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
    if (category === 'anime') {
      const data = await tmdbFetch('/discover/tv', { with_genres: 16, page, sort_by: 'popularity.desc' })
      return {
        results: (data.results || []).map(item => ({ ...item, media_type: 'tv' })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
    if (category === 'action') {
      const data = await tmdbFetch('/discover/movie', { with_genres: 28, page, sort_by: 'popularity.desc' })
      return {
        results: (data.results || []).map(item => ({ ...item, media_type: 'movie' })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
    if (category === 'scifi') {
      const data = await tmdbFetch('/discover/movie', { with_genres: 878, page, sort_by: 'popularity.desc' })
      return {
        results: (data.results || []).map(item => ({ ...item, media_type: 'movie' })),
        totalPages: Math.min(data.total_pages || 1, 500)
      }
    }
  }

  // Otherwise, it's the filter discover query
  const isTv = type === 'tv'
  const isAnime = type === 'anime'
  const isAll = type === 'all' || !type

  if (isAnime) {
    const movieParams = { page, sort_by: year ? 'primary_release_date.desc' : 'popularity.desc' }
    const tvParams = { page, sort_by: year ? 'first_air_date.desc' : 'popularity.desc' }
    if (year) {
      movieParams['primary_release_date.lte'] = currentDate
      tvParams['first_air_date.lte'] = currentDate
    }
    
    let movieGenre = '16'
    let tvGenre = '16'
    
    if (genre) {
      movieGenre = `16,${genre}`
      let extraTvGenre = genre
      if (extraTvGenre === '28') extraTvGenre = '10759'
      else if (extraTvGenre === '878') extraTvGenre = '10765'
      else if (extraTvGenre === '12') extraTvGenre = '10759'
      tvGenre = `16,${extraTvGenre}`
    }
    
    movieParams.with_genres = movieGenre
    tvParams.with_genres = tvGenre
    
    if (year) {
      movieParams.primary_release_year = year
      tvParams.first_air_date_year = year
    }
    if (lang) {
      movieParams.with_original_language = lang
      tvParams.with_original_language = lang
    }
    
    const [movieData, tvData] = await Promise.all([
      tmdbFetch('/discover/movie', movieParams).catch(() => ({ results: [], total_pages: 1 })),
      tmdbFetch('/discover/tv', tvParams).catch(() => ({ results: [], total_pages: 1 }))
    ])
    
    const combined = [
      ...(movieData.results || []).map(item => ({ ...item, media_type: 'movie' })),
      ...(tvData.results || []).map(item => ({ ...item, media_type: 'tv' }))
    ]
    
    if (year) {
      combined.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || ''
        const dateB = b.release_date || b.first_air_date || ''
        return dateB.localeCompare(dateA)
      })
    } else {
      combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    
    return {
      results: combined,
      totalPages: Math.min(Math.max(movieData.total_pages || 1, tvData.total_pages || 1), 500)
    }
  }

  if (isAll) {
    const movieParams = { page, sort_by: year ? 'primary_release_date.desc' : 'popularity.desc' }
    const tvParams = { page, sort_by: year ? 'first_air_date.desc' : 'popularity.desc' }
    if (year) {
      movieParams['primary_release_date.lte'] = currentDate
      tvParams['first_air_date.lte'] = currentDate
    }
    
    if (genre) {
      movieParams.with_genres = genre
      let tvGenre = genre
      if (genre === '28') tvGenre = '10759'
      else if (genre === '878') tvGenre = '10765'
      else if (genre === '12') tvGenre = '10759'
      tvParams.with_genres = tvGenre
    }
    if (year) {
      movieParams.primary_release_year = year
      tvParams.first_air_date_year = year
    }
    if (lang) {
      movieParams.with_original_language = lang
      tvParams.with_original_language = lang
    }
    
    const [movieData, tvData] = await Promise.all([
      tmdbFetch('/discover/movie', movieParams).catch(() => ({ results: [], total_pages: 1 })),
      tmdbFetch('/discover/tv', tvParams).catch(() => ({ results: [], total_pages: 1 }))
    ])
    
    const combined = [
      ...(movieData.results || []).map(item => ({ ...item, media_type: 'movie' })),
      ...(tvData.results || []).map(item => ({ ...item, media_type: 'tv' }))
    ]
    
    if (year) {
      combined.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || ''
        const dateB = b.release_date || b.first_air_date || ''
        return dateB.localeCompare(dateA)
      })
    } else {
      combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    
    return {
      results: combined,
      totalPages: Math.min(Math.max(movieData.total_pages || 1, tvData.total_pages || 1), 500)
    }
  }

  const endpoint = isTv ? '/discover/tv' : '/discover/movie'
  const params = {
    page,
    sort_by: year ? (isTv ? 'first_air_date.desc' : 'primary_release_date.desc') : 'popularity.desc'
  }
  if (year) {
    params[isTv ? 'first_air_date.lte' : 'primary_release_date.lte'] = currentDate
  }
  if (genre) {
    let targetGenreId = genre
    if (isTv) {
      if (genre === '28') targetGenreId = '10759'
      else if (genre === '878') targetGenreId = '10765'
      else if (genre === '12') targetGenreId = '10759'
    }
    params.with_genres = targetGenreId
  }
  if (year) {
    if (isTv) {
      params.first_air_date_year = year
    } else {
      params.primary_release_year = year
    }
  }
  if (lang) {
    params.with_original_language = lang
  }
  
  const data = await tmdbFetch(endpoint, params)
  return {
    results: (data.results || []).map(item => ({ ...item, media_type: isTv ? 'tv' : 'movie' })),
    totalPages: Math.min(data.total_pages || 1, 500)
  }
}

function GridCard({ movie }) {
  const targetId = String(movie.id || movie.tmdb_id)
  const targetType = movie.media_type || 'movie'

  const hasRating = movie.vote_average && movie.vote_average > 0
  const tmdbScoreText = hasRating ? movie.vote_average.toFixed(1) : '❌'
  const rtScoreText = hasRating ? `${Math.max(10, Math.min(100, Math.round(movie.vote_average * 10 + (movie.vote_average >= 7.5 ? 6 : (movie.vote_average <= 5.5 ? -8 : -2)))))}%` : '❌'
  const imdbScoreText = hasRating ? Math.max(1.0, Math.min(10.0, movie.vote_average - 0.2 + (movie.vote_average > 8 ? 0.1 : (movie.vote_average < 6 ? -0.3 : 0)))).toFixed(1) : '❌'

  return (
    <Link
      href={`/media/${targetType}/${targetId}`}
      className="grid-netflix-card"
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        aspectRatio: '2/3',
        background: '#1c1c2e',
        display: 'block'
      }}
    >
      <PosterImage
        src={getPosterUrl(movie.poster_path)}
        alt={movie.title || movie.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
        style={{ objectFit: 'cover' }}
      />
      
      {/* Top Glassmorphic Ratings Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to bottom, rgba(9, 9, 14, 0.95) 0%, rgba(9, 9, 14, 0.7) 100%)',
        backdropFilter: 'blur(4px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 6px',
        zIndex: 3
      }}>
        {/* RT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.625rem', fontWeight: '800', color: '#ef4444' }} title="Rotten Tomatoes Score">
          <span style={{ fontSize: '0.7rem' }}>🍅</span>
          {rtScoreText}
        </div>
        {/* IMDb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.625rem', fontWeight: '800', color: '#38bdf8' }} title="IMDb Score">
          <span style={{ fontSize: '0.45rem', padding: '1px 2px', background: '#fbbf24', color: '#000', borderRadius: '2px', fontWeight: '900', lineHeight: 1 }}>IMDb</span>
          {imdbScoreText}
        </div>
      </div>
      <div 
        className="card-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(9, 9, 14, 0.95) 0%, rgba(9, 9, 14, 0.4) 60%, transparent 100%)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          opacity: 0,
          transition: 'opacity 0.25s ease',
          zIndex: 2
        }}
      >
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.2,
          marginBottom: 4
        }}>
          {movie.title || movie.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#cbd5e1' }}>
          <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0]}</span>
          {movie.vote_average > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontWeight: 800 }}>
              ★ {movie.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const maxPages = Math.min(totalPages, 500)
  
  const range = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(maxPages, currentPage + 2)
  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '2rem 0' }}>
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          padding: '0.5rem 0.85rem',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: currentPage === 1 ? '#475569' : '#e2e8f0',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          fontWeight: 700,
          transition: 'all 0.2s',
        }}
      >
        Prev
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            }}
          >
            1
          </button>
          {start > 2 && <span style={{ color: '#475569', fontSize: '0.85rem' }}>...</span>}
        </>
      )}

      {range.map(p => {
        const isActive = p === currentPage
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isActive ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255, 255, 255, 0.05)',
              border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: isActive ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {p}
          </button>
        )
      })}

      {end < maxPages && (
        <>
          {end < maxPages - 1 && <span style={{ color: '#475569', fontSize: '0.85rem' }}>...</span>}
          <button
            onClick={() => onPageChange(maxPages)}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            }}
          >
            {maxPages}
          </button>
        </>
      )}

      <button
        disabled={currentPage === maxPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          padding: '0.5rem 0.85rem',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: currentPage === maxPages ? '#475569' : '#e2e8f0',
          cursor: currentPage === maxPages ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          fontWeight: 700,
          transition: 'all 0.2s',
        }}
      >
        Next
      </button>
    </div>
  )
}

// ── Main search component ─────────────────────────────────────
function SearchContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const initialQuery = searchParams.get('q') || ''
  const initialType = searchParams.get('type') || 'all'
  const initialGenre = searchParams.get('genre') || ''
  const initialYear = searchParams.get('year') || ''
  const initialLang = searchParams.get('lang') || ''
  const initialCategory = searchParams.get('category') || ''
  const initialPage = parseInt(searchParams.get('p') || '1', 10)

  const [input, setInput] = useState(initialQuery)
  const [type, setType] = useState(initialType)
  const [genre, setGenre] = useState(initialGenre)
  const [year, setYear] = useState(initialYear)
  const [lang, setLang] = useState(initialLang)
  const [category, setCategory] = useState(initialCategory)
  const [page, setPage] = useState(initialPage)
  
  const [isFilterActive, setIsFilterActive] = useState(
    Boolean(initialGenre || initialYear || initialLang || initialCategory || searchParams.has('type'))
  )

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

  function syncFilters(updates) {
    const nextType = updates.hasOwnProperty('type') ? updates.type : type
    const nextGenre = updates.hasOwnProperty('genre') ? updates.genre : genre
    const nextYear = updates.hasOwnProperty('year') ? updates.year : year
    const nextLang = updates.hasOwnProperty('lang') ? updates.lang : lang
    const nextCategory = updates.hasOwnProperty('category') ? updates.category : category
    const nextPage = updates.hasOwnProperty('page') ? updates.page : page
    const nextInput = updates.hasOwnProperty('input') ? updates.input : input

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams()
      if (nextInput) params.set('q', nextInput)
      
      const hasAnyFilter = nextCategory || nextGenre || nextYear || nextLang || updates.hasOwnProperty('type') || updates.hasOwnProperty('genre') || updates.hasOwnProperty('year') || updates.hasOwnProperty('lang') || updates.hasOwnProperty('category')
      if (hasAnyFilter) {
        if (nextType) params.set('type', nextType)
        if (nextGenre) params.set('genre', nextGenre)
        if (nextYear) params.set('year', nextYear)
        if (nextLang) params.set('lang', nextLang)
        if (nextCategory) params.set('category', nextCategory)
        if (nextPage && nextPage > 1) params.set('p', nextPage)
      }

      const queryString = params.toString()
      const targetUrl = queryString ? `/?${queryString}` : '/'
      window.history.replaceState(window.history.state, '', targetUrl)
    }
  }

  function handleInput(value) {
    setInput(value)
    syncFilters({ input: value })
    if (value.length >= 2) {
      tmdbSearch(value)
    } else {
      clear()
    }
  }

  const handleFilterChange = (name, value) => {
    let updates = { page: 1 }
    
    if (name === 'type') {
      setType(value)
      updates.type = value
    } else if (name === 'genre') {
      setGenre(value)
      updates.genre = value
    } else if (name === 'year') {
      setYear(value)
      updates.year = value
    } else if (name === 'lang') {
      setLang(value)
      updates.lang = value
    }
    
    setCategory('')
    updates.category = ''
    setPage(1)
    
    setIsFilterActive(true)
    syncFilters(updates)
  }

  const categoryMap = {
    '🔥 Trending This Week': 'trending',
    '📺 Popular TV Shows': 'tv',
    '🌸 Anime & Animation Hits': 'anime',
    '💥 Action & Adventure': 'action',
    '🛸 Sci-Fi & Fantasy': 'scifi'
  }

  const categoryTitleMap = {
    trending: '🔥 Trending This Week',
    tv: '📺 Popular TV Shows',
    anime: '🌸 Anime & Animation Hits',
    action: '💥 Action & Adventure',
    scifi: '🛸 Sci-Fi & Fantasy'
  }

  const handleMoreClick = (title) => {
    const categoryKey = categoryMap[title] || 'trending'
    setCategory(categoryKey)
    setPage(1)
    
    setGenre('')
    setYear('')
    setLang('')
    
    setIsFilterActive(true)
    syncFilters({
      category: categoryKey,
      page: 1,
      genre: '',
      year: '',
      lang: ''
    })
  }

  const handleReset = () => {
    setType('all')
    setGenre('')
    setYear('')
    setLang('')
    setCategory('')
    setPage(1)
    
    setIsFilterActive(false)
    syncFilters({
      type: 'all',
      genre: '',
      year: '',
      lang: '',
      category: '',
      page: 1
    })
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    syncFilters({ page: newPage })
  }

  const isTyping = input.length >= 2
  const isGridActive = isFilterActive

  const { data: gridData, isLoading: isGridLoading, error: gridError } = useQuery({
    queryKey: ['discoverGrid', { category, type, genre, year, lang, page }],
    queryFn: () => fetchDiscoverGrid({ category, type, genre, year, lang, page }),
    enabled: isGridActive && !isTyping,
    staleTime: 60_000,
  })

  // Generate years list
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 2010; y--) {
    years.push(String(y))
  }
  years.push('2005', '2000', '1995', '1990')

  const selectStyle = {
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#e2e8f0',
    padding: '0.6rem 2.2rem 0.6rem 1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s',
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '14px',
  }

  return (
    <div className="page-shell mobile-safe-bottom">
      <style>{`
        .grid-netflix-card:hover {
          transform: scale(1.05) translateY(-4px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.6), 0 4px 12px rgba(124,58,237,0.3);
        }
        .grid-netflix-card:hover .card-overlay {
          opacity: 1 !important;
        }
      `}</style>

      {/* Spacer top */}
      <div style={{ height: '0.75rem' }} />

      {/* Search Input at Top */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
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
        {input && !tmdbSearchLoading && (
          <button onClick={() => { setInput(''); clear(); syncFilters({ input: '' }) }} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
          }}><X size={18} /></button>
        )}
        {tmdbSearchLoading && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Filter Row - Hidden when typing search */}
      {!isTyping && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <select style={selectStyle} value={type} onChange={e => handleFilterChange('type', e.target.value)}>
            <option value="all" style={{ background: '#09090e' }}>All Types</option>
            <option value="movie" style={{ background: '#09090e' }}>Movies</option>
            <option value="tv" style={{ background: '#09090e' }}>TV Shows</option>
            <option value="anime" style={{ background: '#09090e' }}>Anime</option>
          </select>

          <select style={selectStyle} value={genre} onChange={e => handleFilterChange('genre', e.target.value)}>
            <option value="" style={{ background: '#09090e' }}>All Genres</option>
            {TMDB_GENRES.map(g => (
              <option key={g.id} value={g.id} style={{ background: '#09090e' }}>{g.name}</option>
            ))}
          </select>

          <select style={selectStyle} value={year} onChange={e => handleFilterChange('year', e.target.value)}>
            <option value="" style={{ background: '#09090e' }}>All Years</option>
            {years.map(y => (
              <option key={y} value={y} style={{ background: '#09090e' }}>{y}</option>
            ))}
          </select>

          <select style={selectStyle} value={lang} onChange={e => handleFilterChange('lang', e.target.value)}>
            <option value="" style={{ background: '#09090e' }}>All Regions</option>
            <option value="en" style={{ background: '#09090e' }}>Hollywood (EN)</option>
            <option value="hi" style={{ background: '#09090e' }}>Bollywood (HI)</option>
            <option value="bn" style={{ background: '#09090e' }}>Bangla (BN)</option>
            <option value="ko" style={{ background: '#09090e' }}>Korean (KO)</option>
            <option value="ja" style={{ background: '#09090e' }}>Japanese (JA)</option>
            <option value="es" style={{ background: '#09090e' }}>Spanish (ES)</option>
            <option value="fr" style={{ background: '#09090e' }}>French (FR)</option>
            <option value="de" style={{ background: '#09090e' }}>German (DE)</option>
            <option value="it" style={{ background: '#09090e' }}>Italian (IT)</option>
            <option value="zh" style={{ background: '#09090e' }}>Chinese (ZH)</option>
            <option value="ru" style={{ background: '#09090e' }}>Russian (RU)</option>
            <option value="tr" style={{ background: '#09090e' }}>Turkish (TR)</option>
            <option value="ar" style={{ background: '#09090e' }}>Arabic (AR)</option>
            <option value="pt" style={{ background: '#09090e' }}>Portuguese (PT)</option>
            <option value="ta" style={{ background: '#09090e' }}>Tamil (TA)</option>
            <option value="te" style={{ background: '#09090e' }}>Telugu (TE)</option>
          </select>

          {isGridActive && (
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '0.55rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {isTyping ? (
        <>
          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Search Results
            </p>
          </div>

          {/* Results */}
          {tmdbSearchLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <LoadingSpinner size="md" />
            </div>
          ) : tmdbSearchError ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📡</div>
              <p style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>
                TMDB search is unavailable.
              </p>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
                {tmdbSearchError?.message || String(tmdbSearchError)}
              </p>
            </div>
          ) : !tmdbSearchResults || tmdbSearchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎭</div>
              <p style={{ color: '#64748b' }}>
                No results for &quot;{input}&quot;
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tmdbSearchResults.map((movie, i) => (
                <ResultRow
                  key={movie.tmdb_id || movie.id || i}
                  movie={movie}
                  searchMode="tmdb"
                  index={i}
                  watchlist={watchlist}
                />
              ))}
            </div>
          )}
        </>
      ) : isGridActive ? (
        <>
          {/* Grid Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#e2e8f0' }}>
                {category ? categoryTitleMap[category] : `${type === 'tv' ? 'Filtered TV Shows' : 'Filtered Movies'}`}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Found matching titles
              </p>
            </div>
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#94a3b8',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            >
              Back to Feed
            </button>
          </div>

          {/* Grid Loading / Error / Content */}
          {isGridLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '16px',
              marginTop: '1rem',
              marginBottom: '2rem'
            }}>
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} style={{ aspectRatio: '2/3', borderRadius: 12 }} className="shimmer" />
              ))}
            </div>
          ) : gridError ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <p style={{ fontSize: '2.5rem' }}>📡</p>
              <p>Could not fetch items. Please try again.</p>
              <p style={{ fontSize: '0.8rem', color: '#475569' }}>{gridError?.message || String(gridError)}</p>
            </div>
          ) : !gridData || gridData.results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <p style={{ fontSize: '2.5rem' }}>🎭</p>
              <p>No titles matched your selected filters.</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '16px',
                marginTop: '1rem',
                marginBottom: '1rem'
              }}>
                {gridData.results.map((movie) => (
                  <GridCard key={movie.id} movie={movie} />
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={gridData.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </>
      ) : (
        <NetflixDiscovery watchlist={watchlist} onMoreClick={handleMoreClick} />
      )}

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
