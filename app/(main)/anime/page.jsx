'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Star, Play, ChevronDown, ArrowRight, ArrowLeft, Sparkles, Filter } from 'lucide-react'
import Link from 'next/link'

import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'

// ── AniList Genres ──────────────────────────────────────────────
const ANIME_GENRES = [
  { id: 'Action', name: 'Action' },
  { id: 'Adventure', name: 'Adventure' },
  { id: 'Comedy', name: 'Comedy' },
  { id: 'Drama', name: 'Drama' },
  { id: 'Fantasy', name: 'Fantasy' },
  { id: 'Mystery', name: 'Mystery' },
  { id: 'Sci-Fi', name: 'Sci-Fi' },
  { id: 'Romance', name: 'Romance' },
]

// ── Year options ───────────────────────────────────────────────
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i))

// ── Sort Options ───────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'TRENDING_DESC', name: 'Trending' },
  { id: 'POPULARITY_DESC', name: 'Most Popular' },
  { id: 'SCORE_DESC', name: 'Top Rated' },
]

export default function AnimePortalPage() {
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
        fetch('/api/anime/trending').then(r => r.json()),
        fetch('/api/anime/search?genre=Action').then(r => r.json()),
        fetch('/api/anime/search?genre=Fantasy').then(r => r.json()),
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
    staleTime: 300_000,
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

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedGenre('')
    setSelectedYear('')
    setSelectedSort('TRENDING_DESC')
    setCurrentPage(1)
  }

  return (
    <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 1000, margin: '0 auto', color: '#F2EFE9', padding: '1rem 1.25rem' }}>
      
      {/* Header Bar */}
      <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.85rem, 5vw, 2.5rem)', letterSpacing: '0.03em', color: '#F2EFE9', lineHeight: 1 }}>
          ANIME PORTAL
        </h1>

        {/* Top Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9A9CA3' }} />
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              minHeight: '38px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#15171C',
              color: '#F2EFE9',
              paddingLeft: '34px',
              paddingRight: searchQuery ? '32px' : '12px',
              fontSize: '0.82rem',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF6A3D'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#9A9CA3', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Sleek Horizontal Filter Pills */}
      <section style={{
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        marginBottom: '1.25rem', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        {/* Genre */}
        <div className="stream-select-wrap" style={{ flexShrink: 0, minWidth: 120 }}>
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
            <option value="">All Genres</option>
            {ANIME_GENRES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Year */}
        <div className="stream-select-wrap" style={{ flexShrink: 0, minWidth: 100 }}>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>

        {/* Sort */}
        <div className="stream-select-wrap" style={{ flexShrink: 0, minWidth: 130 }}>
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
              minHeight: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid #FF6A3D',
              background: 'rgba(255, 106, 61, 0.12)', color: '#FF6A3D', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0
            }}
          >
            Clear
          </button>
        )}
      </section>

      {/* Main Feed or Grid */}
      {feedLoading || gridLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px' }}>
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isFilterActive ? (
        <div>
          {gridData?.results?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#15171C', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌸</div>
              <h3 style={{ color: '#F2EFE9', margin: '0 0 0.5rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}>NO ANIME FOUND</h3>
              <p style={{ color: '#9A9CA3', margin: 0, fontSize: '0.85rem' }}>Try refining your search or filter keywords.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px', marginBottom: '2rem' }}>
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
                      display: 'flex', alignItems: 'center', gap: '6px', minHeight: '38px', padding: '0 14px',
                      borderRadius: '10px', background: '#15171C', color: currentPage === 1 ? '#64748b' : '#F2EFE9',
                      border: '1px solid rgba(255,255,255,0.08)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700
                    }}
                  >
                    <ArrowLeft size={14} /> Prev
                  </button>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 750, color: '#9A9CA3' }}>
                    PAGE <strong style={{ color: '#FF6A3D' }}>{currentPage}</strong> OF {gridData.totalPages}
                  </span>
                  <button
                    disabled={currentPage === gridData.totalPages}
                    onClick={() => setCurrentPage(p => Math.min(gridData.totalPages, p + 1))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', minHeight: '38px', padding: '0 14px',
                      borderRadius: '10px', background: '#15171C', color: currentPage === gridData.totalPages ? '#64748b' : '#F2EFE9',
                      border: '1px solid rgba(255,255,255,0.08)', cursor: currentPage === gridData.totalPages ? 'not-allowed' : 'pointer',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Featured Hero Banner */}
          {heroAnime && (
            <div style={{
              position: 'relative', height: 280, borderRadius: 20, overflow: 'hidden',
              background: '#0D0E12', border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
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
                    filter: 'brightness(0.45)'
                  }}
                />
              </AnimatePresence>

              {/* Scrim overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, #0D0E12 0%, transparent 60%), linear-gradient(to right, #0D0E12 25%, transparent 75%)',
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
                    maxWidth: 460
                  }}
                >
                  <span style={{
                    alignSelf: 'flex-start', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
                    letterSpacing: '0.12em', color: '#E8B23D', fontWeight: 800, textTransform: 'uppercase'
                  }}>
                    — FEATURED ANIME PICK
                  </span>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.02em', color: '#F2EFE9', margin: 0, lineHeight: 1.05 }}>
                    {heroAnime.title?.english || heroAnime.title?.romaji}
                  </h2>
                  <p style={{
                    margin: '2px 0 8px', color: '#9A9CA3', fontSize: '0.8rem',
                    lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {heroAnime.description?.replace(/<[^>]*>/g, '')}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      href={`/anime/${heroAnime.id}`}
                      className="btn-primary"
                      style={{
                        padding: '0.55rem 1.25rem', fontSize: '0.82rem',
                        display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none'
                      }}
                    >
                      <Play size={14} fill="currentColor" stroke="none" /> WATCH NOW
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Carousel Pagination Dots */}
              <div style={{ position: 'absolute', bottom: 18, right: 24, zIndex: 5, display: 'flex', gap: 6 }}>
                {heroItems.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    style={{
                      width: i === heroIndex ? 20 : 6, height: 6, borderRadius: 99,
                      background: i === heroIndex ? '#FF6A3D' : 'rgba(255,255,255,0.3)',
                      cursor: 'pointer', transition: 'all 0.25s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section Rows */}
          {[
            ...(myAnimeList.length > 0 ? [{ title: 'MY WATCHING LIST', items: myAnimeList }] : []),
            { title: 'WEEKLY TRENDING ANIME', items: feedData?.trending },
            { title: 'ALL-TIME POPULAR HITS', items: feedData?.popular },
            { title: 'ACTION & ADVENTURE', items: feedData?.action },
            { title: 'SCI-FI & FANTASY', items: feedData?.fantasy },
          ].map((row, rowIdx) => {
            if (!row.items?.length) return null
            return (
              <div key={rowIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ width: '4px', height: '1.25rem', background: '#FF6A3D', borderRadius: '99px' }} />
                  <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.03em', color: '#F2EFE9' }}>
                    {row.title}
                  </h3>
                </div>
                
                {/* Horizontal Scroller */}
                <div
                  className="netflix-row-scroller"
                  style={{
                    display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '10px',
                    paddingLeft: '2px', paddingRight: '2px', scrollbarWidth: 'none'
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

      <style>{`
        .stream-select-wrap {
          position: relative;
        }
        .stream-select-wrap select {
          width: 100%;
          appearance: none;
          min-height: 38px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #15171C;
          color: #F2EFE9;
          padding: 0.4rem 2rem 0.4rem 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          outline: none;
        }
        .stream-select-wrap option {
          background: #15171C;
          color: #F2EFE9;
        }
        .stream-select-wrap svg {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #9A9CA3;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

// ── Standard 140x210 Poster Card Component ────────────────────
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
  const scoreVal = norm.averageScore ? (norm.averageScore / 10).toFixed(1) : null

  return (
    <Link
      href={`/anime/${targetId}`}
      style={{
        width: 140,
        height: 210,
        flexShrink: 0,
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#15171C',
        display: 'block',
        textDecoration: 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 106, 61, 0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <PosterImage
        src={norm.coverImage}
        alt={norm.title}
        fill
        sizes="140px"
        style={{ objectFit: 'cover' }}
      />

      {/* Rating chip top-left */}
      {scoreVal && (
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 3,
          padding: '2px 6px', borderRadius: 6,
          background: 'rgba(10, 11, 14, 0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex', alignItems: 'center', gap: 3,
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800, color: '#F2EFE9'
        }}>
          <Star size={10} fill="#E8B23D" color="#E8B23D" />
          {scoreVal}
        </div>
      )}

      {/* Type badge top-right */}
      <div style={{
        position: 'absolute', top: 8, right: 8, zIndex: 3,
        padding: '2px 5px', borderRadius: 4,
        background: 'rgba(255, 106, 61, 0.2)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 106, 61, 0.4)',
        color: '#FF6A3D', fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.6rem', fontWeight: 800
      }}>
        ANIME
      </div>

      {/* Bottom Title Scrim Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(to top, rgba(10, 11, 14, 0.95) 0%, transparent 60%)',
        display: 'flex', alignItems: 'flex-end', padding: '10px'
      }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color: '#F2EFE9', lineHeight: 1.25,
          fontFamily: "'Manrope', sans-serif",
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {norm.title}
        </span>
      </div>
    </Link>
  )
}
