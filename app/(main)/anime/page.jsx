'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Star, Tv, Flame, Trophy, Play, ChevronDown, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

// Custom loader/ui
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'


// ── AniList Genres ──────────────────────────────────────────────
const ANIME_GENRES = [
  { id: 'Action', name: '⚔️ Action' },
  { id: 'Adventure', name: '🗺️ Adventure' },
  { id: 'Comedy', name: '😂 Comedy' },
  { id: 'Drama', name: '🎭 Drama' },
  { id: 'Fantasy', name: '🪄 Fantasy' },
  { id: 'Mystery', name: '🔍 Mystery' },
  { id: 'Sci-Fi', name: '🚀 Sci-Fi' },
  { id: 'Romance', name: '💖 Romance' },
]

// ── Year options ───────────────────────────────────────────────
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i))

// ── Sort Options ───────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'TRENDING_DESC', name: '🔥 Trending' },
  { id: 'POPULARITY_DESC', name: '❤️ Most Popular' },
  { id: 'SCORE_DESC', name: '⭐ Top Rated' },
]

export default function AnimePortalPage() {
  // Navigation & filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSort, setSelectedSort] = useState('TRENDING_DESC')
  const [currentPage, setCurrentPage] = useState(1)

  const [heroIndex, setHeroIndex] = useState(0)

  const { user } = useAuth()

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

  const myAnimeList = useMemo(() => {
    return (watchlist || []).filter(m => m.media_type === 'anime')
  }, [watchlist])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGenre, selectedYear, selectedSort])

  const isFilterActive = Boolean(debouncedSearch || selectedGenre || selectedYear)

  // ── 1. Fetch Anime Feed (when no filter is active) ────────────────
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['animeFeed'],
    queryFn: async () => {
      const [trendingRes, actionRes, fantasyRes, popularRes] = await Promise.all([
        // Trending Weekly
        fetch('/api/anime/trending').then(r => r.json()),
        // Action Anime
        fetch('/api/anime/search?genre=Action').then(r => r.json()),
        // Fantasy Anime
        fetch('/api/anime/search?genre=Fantasy').then(r => r.json()),
        // Popular Movies/Shows
        fetch('/api/anime/popular').then(r => r.json()),
      ])

      return {
        trending: trendingRes?.Page?.media || [],
        action: actionRes?.Page?.media || [],
        fantasy: fantasyRes?.Page?.media || [],
        popular: popularRes?.Page?.media || [],
      }
    },
    enabled: !isFilterActive,
    staleTime: 300_000, // 5 min
  })

  // ── 2. Fetch Discover Grid (when filter/search is active) ──────────
  const { data: gridData, isLoading: gridLoading } = useQuery({
    queryKey: ['animeGrid', debouncedSearch, selectedGenre, selectedYear, selectedSort, currentPage],
    queryFn: async () => {
      let url = `/api/anime/search?page=${currentPage}`
      if (debouncedSearch) {
        url += `&query=${encodeURIComponent(debouncedSearch)}`
      } else {
        url += `&sort=${selectedSort}`
        if (selectedGenre) url += `&genre=${selectedGenre}`
        if (selectedYear) url += `&year=${selectedYear}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch anime grid')
      const json = await res.json()

      return {
        results: json?.Page?.media || [],
        totalPages: json?.Page?.pageInfo?.lastPage || 1,
      }
    },
    enabled: isFilterActive,
    staleTime: 60_000,
  })

  // Auto-cycle Hero Banner
  const heroItems = feedData?.trending?.slice(0, 5) || []
  useEffect(() => {
    if (heroItems.length === 0) return
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [heroItems])

  const heroAnime = heroItems[heroIndex]

  // Clear filters
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedGenre('')
    setSelectedYear('')
    setSelectedSort('TRENDING_DESC')
    setCurrentPage(1)
  }

  return (
    <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 1000, margin: '0 auto', color: '#fff' }}>
      
      {/* Orange-themed Custom Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.65rem', padding: '3px 8px', background: 'rgba(244,117,33,0.15)', color: '#f47521', border: '1px solid rgba(244,117,33,0.3)', borderRadius: '6px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Crunchyroll Portal
          </span>
          <h1 className="page-title" style={{ margin: '0.35rem 0 0 0', fontSize: '1.85rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff 30%, #f47521 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Watch Anime
          </h1>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              minHeight: '38px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#fff',
              paddingLeft: '34px',
              paddingRight: searchQuery ? '32px' : '12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(244, 117, 33, 0.4)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Discovery Filters Bar */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem',
        marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '0.5rem', borderRadius: '16px'
      }}>
        {/* Genre */}
        <div className="stream-select-wrap">
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
            <option value="">All Genres</option>
            {ANIME_GENRES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Year */}
        <div className="stream-select-wrap">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Sort */}
        <div className="stream-select-wrap">
          <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)} disabled={Boolean(debouncedSearch)}>
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Reset */}
        {isFilterActive && (
          <button
            onClick={resetFilters}
            style={{
              minHeight: '38px', borderRadius: '12px', border: '1px solid rgba(244,117,33,0.3)',
              background: 'rgba(244,117,33,0.1)', color: '#f47521', cursor: 'pointer',
              fontWeight: 800, fontSize: '0.78rem', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,117,33,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,117,33,0.1)' }}
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* Grid or Rows Renderer */}
      {feedLoading || gridLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 14 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isFilterActive ? (
        // Filter Grid
        <div>
          {gridData?.results?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌸</div>
              <h3 style={{ color: '#cbd5e1', margin: '0 0 0.5rem', fontWeight: 700 }}>No anime found</h3>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.82rem' }}>Try refining your search or filters.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
                {gridData?.results?.map((anime) => (
                  <AnimeCard key={anime.id} movie={anime} />
                ))}
              </div>

              {/* Pagination */}
              {gridData?.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '0 12px',
                      borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: currentPage === 1 ? '#475569' : '#fff',
                      border: '1px solid rgba(255,255,255,0.08)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ArrowLeft size={14} /> Prev
                  </button>
                  <span style={{ fontSize: '0.82rem', fontWeight: 750, color: '#94a3b8' }}>
                    Page <strong style={{ color: '#f47521' }}>{currentPage}</strong> of {gridData.totalPages}
                  </span>
                  <button
                    disabled={currentPage === gridData.totalPages}
                    onClick={() => setCurrentPage(p => Math.min(gridData.totalPages, p + 1))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '0 12px',
                      borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: currentPage === gridData.totalPages ? '#475569' : '#fff',
                      border: '1px solid rgba(255,255,255,0.08)', cursor: currentPage === gridData.totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // Normal Crunchyroll Feed Rows
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Rotating Hero Banner */}
          {heroAnime && (
            <div style={{
              position: 'relative', height: 280, borderRadius: 24, overflow: 'hidden',
              background: '#09090e',
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.4)',
            }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={heroAnime.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${heroAnime.bannerImage || heroAnime.coverImage?.large})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'brightness(0.5)'
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
                  key={heroAnime.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '24px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px',
                    maxWidth: 420
                  }}
                >
                  <span style={{
                    alignSelf: 'flex-start', fontSize: '0.62rem', padding: '2px 6px',
                    background: 'rgba(244,117,33,0.25)', color: '#f47521',
                    border: '1px solid rgba(244,117,33,0.4)', borderRadius: 6, fontWeight: 900
                  }}>
                    TRENDING ANIME
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                    {heroAnime.title?.english || heroAnime.title?.romaji}
                  </h2>
                  <p style={{
                    margin: '4px 0 8px', color: '#94a3b8', fontSize: '0.78rem',
                    lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {heroAnime.description?.replace(/<[^>]*>/g, '')}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      href={`/anime/${heroAnime.id}`}
                      style={{
                        textDecoration: 'none', padding: '0.5rem 1.1rem', fontSize: '0.8rem',
                        display: 'flex', alignItems: 'center', gap: 6, background: '#f47521',
                        color: '#fff', borderRadius: '12px', fontWeight: 800,
                      }}
                    >
                      <Play size={14} fill="#fff" stroke="none" /> Watch Now
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Rows */}
          {[
            ...(myAnimeList.length > 0 ? [{ title: '🔖 My Watching List', items: myAnimeList }] : []),
            { title: '🔥 Weekly Trending Anime', items: feedData?.trending },
            { title: '⭐ All-Time Popular Hits', items: feedData?.popular },
            { title: '⚔️ Action & Adventure', items: feedData?.action },
            { title: '🪄 Sci-Fi & Fantasy', items: feedData?.fantasy },
          ].map((row, rowIdx) => {
            if (!row.items?.length) return null
            return (
              <div key={rowIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', margin: 0 }}>{row.title}</h3>
                </div>
                
                {/* Horizontal Scroller */}
                <div
                  className="netflix-row-scroller"
                  style={{
                    display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px',
                    paddingLeft: '2px', paddingRight: '2px'
                  }}
                >
                  {row.items.map(anime => (
                    <AnimeCard key={anime.id || anime.tmdb_id} movie={anime} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Crunchyroll Orange hover CSS */}
      <style>{`
        .anime-poster-card:hover {
          transform: scale(1.08) translateY(-4px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.6), 0 4px 12px rgba(244,117,33,0.3);
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
          background: rgba(244,117,33,0.3);
          border-radius: 99px;
        }
        .wn-sidebar {
          border-right: 1px solid rgba(244, 117, 33, 0.15);
        }
        .stream-select-wrap {
          position: relative;
        }
        .stream-select-wrap select {
          width: 100%;
          appearance: none;
          min-height: 38px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          color: #fff;
          padding: 0.4rem 2rem 0.4rem 0.75rem;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          outline: none;
        }
        .stream-select-wrap option {
          background: #1c1c2e;
          color: #fff;
        }
        .stream-select-wrap svg {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

// ── Generic Anime Card ─────────────────────────────────────────
function AnimeCard({ movie }) {
  const norm = useMemo(() => {
    if (!movie) return null
    return {
      id: movie.tmdb_id || movie.id,
      title: movie.title?.english || movie.title?.romaji || movie.title,
      coverImage: movie.coverImage?.large || movie.poster_path,
      averageScore: movie.averageScore || (movie.tmdb_rating ? movie.tmdb_rating * 10 : null)
    }
  }, [movie])

  if (!norm) return null

  const targetId = String(norm.id)
  
  // Rating mappings (copied from discovery cards)
  const hasRating = norm.averageScore && norm.averageScore > 0
  const voteAverage = hasRating ? norm.averageScore / 10 : 0
  const rtScoreText = hasRating ? `${Math.max(10, Math.min(100, Math.round(voteAverage * 10 + (voteAverage >= 7.5 ? 6 : (voteAverage <= 5.5 ? -8 : -2)))))}%` : '❌'
  const imdbScoreText = hasRating ? Math.max(1.0, Math.min(10.0, voteAverage - 0.2 + (voteAverage > 8 ? 0.1 : (voteAverage < 6 ? -0.3 : 0)))).toFixed(1) : '❌'

  return (
    <Link
      href={`/anime/${targetId}`}
      className="anime-poster-card"
      style={{
        width: 110,
        flexShrink: 0,
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
        src={norm.coverImage}
        alt={norm.title}
        fill
        sizes="110px"
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
    </Link>
  )
}
