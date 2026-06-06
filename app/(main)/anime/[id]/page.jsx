'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Play, Tv, Users, Heart, Info, Calendar, Sparkles, AlertTriangle, Bookmark, BookmarkCheck } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'
import { useDirectWatchlist } from '@/hooks/useReactions'
import { authFetch } from '@/lib/auth-fetch'

// Custom loader/ui
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'

export default function AnimeDetailPage({ params }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const animeId = resolvedParams.id

  const { user } = useAuth()
  const { toggleDirect, isDirectToggling } = useDirectWatchlist()

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

  const isSaved = useMemo(() => {
    return (watchlist || []).some(
      m => String(m.tmdb_id) === String(animeId) && String(m.media_type) === 'anime'
    )
  }, [watchlist, animeId])

  const handleBookmarkToggle = () => {
    if (!animeData) return
    const animeObj = {
      id: Number(animeId),
      title: animeData.title.english || animeData.title.romaji,
      poster_path: animeData.coverImage.large,
      genres: animeData.genres || [],
      vote_average: animeData.averageScore ? animeData.averageScore / 10 : null,
      release_year: animeData.seasonYear || null,
      media_type: 'anime'
    }
    toggleDirect(animeObj)
  }

  // Sub/Dub state
  const [isDub, setIsDub] = useState(false)
  const [selectedGogoId, setSelectedGogoId] = useState('')

  // ── 1. Fetch AniList Anime Metadata ─────────────────────────────
  const { data: animeData, isLoading: animeLoading, error: animeError } = useQuery({
    queryKey: ['anilistInfo', animeId],
    queryFn: async () => {
      const res = await fetch(`/api/anime/info?id=${animeId}`)
      if (!res.ok) throw new Error('Failed to fetch anime info')
      const json = await res.json()
      if (json.redirect) {
        router.replace(`/media/${json.mediaType}/${json.tmdbId}`)
        return null
      }
      if (json.resolvedId) {
        router.replace(`/anime/${json.resolvedId}`)
      }
      return json.Media
    },
    enabled: !!animeId,
  })

  // Main title for search mapping
  const searchTitle = useMemo(() => {
    if (!animeData) return ''
    return animeData.title.english || animeData.title.romaji || ''
  }, [animeData])

  // ── 2. Search GogoAnime ID ──────────────────────────────────────
  const { data: gogoSearchData, isLoading: searchLoading } = useQuery({
    queryKey: ['gogoSearch', searchTitle, isDub],
    queryFn: async () => {
      const query = isDub ? `${searchTitle} (Dub)` : searchTitle
      const res = await fetch(`/api/gogoanime/search?query=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Failed to search GogoAnime')
      return res.json()
    },
    enabled: !!searchTitle,
  })

  // Calculate best Gogo ID using scoring
  const bestGogoId = useMemo(() => {
    if (!gogoSearchData?.results?.length || !searchTitle) return ''

    const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '')
    const targetClean = cleanStr(searchTitle)

    let bestId = gogoSearchData.results[0].id
    let bestScore = -1

    gogoSearchData.results.forEach((item) => {
      const itemClean = cleanStr(item.title)
      let score = 0

      if (itemClean === targetClean) {
        score = 100 // exact match
      } else if (itemClean === targetClean + 'dub' || itemClean === targetClean + 'dubbed') {
        score = 95 // exact match with dub
      } else if (itemClean === targetClean + 'sub' || itemClean === targetClean + 'subbed') {
        score = 95 // exact match with sub
      } else if (itemClean.startsWith(targetClean)) {
        score = 80 - Math.abs(itemClean.length - targetClean.length)
      } else if (itemClean.includes(targetClean)) {
        score = 60 - Math.abs(itemClean.length - targetClean.length)
      }

      if (score > bestScore) {
        bestScore = score
        bestId = item.id
      }
    })

    return bestId
  }, [gogoSearchData, searchTitle])

  // Auto-select best Gogo ID
  useEffect(() => {
    if (bestGogoId) {
      setSelectedGogoId(bestGogoId)
    } else {
      setSelectedGogoId('')
    }
  }, [bestGogoId])

  // ── 3. Fetch GogoAnime Details (Episode List) ─────────────────────
  const { data: gogoInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['gogoInfo', selectedGogoId],
    queryFn: async () => {
      const res = await fetch(`/api/gogoanime/info?id=${selectedGogoId}`)
      if (!res.ok) throw new Error('Failed to fetch GogoAnime details')
      return res.json()
    },
    enabled: !!selectedGogoId,
  })

  const firstEpisode = useMemo(() => {
    if (!gogoInfo?.episodes?.length) return null
    return gogoInfo.episodes.find(e => e.episodeNumber === 1) || gogoInfo.episodes[0]
  }, [gogoInfo])

  const sortedEpisodes = useMemo(() => {
    if (!gogoInfo?.episodes) return []
    return [...gogoInfo.episodes].sort((a, b) => b.episodeNumber - a.episodeNumber)
  }, [gogoInfo])

  if (animeLoading) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 640, margin: '0 auto', padding: '1.25rem' }}>
        <div style={{ height: 280, borderRadius: 24, marginBottom: 24 }} className="shimmer" />
        <CardSkeleton />
      </div>
    )
  }

  if (animeError || !animeData) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 640, margin: '4rem auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#e2e8f0' }}>Anime Not Found</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>We couldn't retrieve the details for this anime.</p>
        <button onClick={() => router.back()} className="btn-primary" style={{ marginTop: '1.5rem' }}>Go Back</button>
      </div>
    )
  }

  // Formatting description (strip HTML tags)
  const cleanDescription = animeData.description
    ? animeData.description.replace(/<[^>]*>/g, '')
    : 'No description available.'

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#070914', overflowX: 'hidden', color: '#fff' }}>
      
      {/* Blurred Cinematic Backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60vh', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {animeData.bannerImage && (
          <Image src={animeData.bannerImage} alt="Background" fill sizes="100vw" priority
            style={{ objectFit: 'cover', filter: 'blur(50px) brightness(0.25)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,9,20,0) 0%, #070914 100%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto', padding: '1.25rem' }}>
        
        {/* Top Floating Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: 'env(safe-area-inset-top)' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.95rem',
              borderRadius: '99px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.8125rem',
              fontWeight: 800, cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {animeData.averageScore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.4rem 0.85rem', borderRadius: '99px', background: 'rgba(244,117,33,0.15)', color: '#f47521', border: '1px solid rgba(244,117,33,0.3)', fontSize: '0.78rem', fontWeight: 850 }}>
                ⭐ {animeData.averageScore}%
              </div>
            )}
            {animeData.status && (
              <div style={{ padding: '0.4rem 0.85rem', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem', fontWeight: 800 }}>
                {animeData.status}
              </div>
            )}
          </div>
        </div>

        {/* Cover Image Hero */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: '350px', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}>
          {animeData.bannerImage ? (
            <Image src={animeData.bannerImage} alt={animeData.title.english || animeData.title.romaji} fill sizes="100vw" style={{ objectFit: 'cover' }} />
          ) : animeData.coverImage.extraLarge ? (
            <Image src={animeData.coverImage.extraLarge} alt={animeData.title.english || animeData.title.romaji} fill sizes="100vw" style={{ objectFit: 'cover', filter: 'blur(5px) brightness(0.6)' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🌸</div>
          )}
          
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,9,20,0.85) 0%, transparent 60%)' }} />
          
          {/* Quick Info Overlay */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <div style={{ width: '70px', height: '100px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)', position: 'relative' }}>
              {animeData.coverImage.large && (
                <Image src={animeData.coverImage.large} alt="" fill sizes="70px" style={{ objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  {animeData.title.english || animeData.title.romaji}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {animeData.title.native}
                </p>
              </div>

              {firstEpisode && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link
                    href={`/anime/watch/${firstEpisode.id}?malId=${animeData.idMal || ''}&ep=${firstEpisode.episodeNumber}&anilistId=${animeId}`}
                    style={{
                      textDecoration: 'none',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '99px',
                      background: 'linear-gradient(135deg, #f47521, #ff9e59)',
                      border: '1px solid rgba(244, 117, 33, 0.4)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(244, 117, 33, 0.4)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 117, 33, 0.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(244, 117, 33, 0.4)' }}
                  >
                    <Play size={13} fill="#fff" stroke="none" /> Watch Now
                  </Link>

                  {user && (
                    <button
                      onClick={handleBookmarkToggle}
                      disabled={isDirectToggling}
                      style={{
                        padding: '0.55rem 1.15rem',
                        borderRadius: '99px',
                        background: isSaved ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        border: isSaved ? 'none' : '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: isSaved ? '0 4px 16px rgba(16,185,129,0.45)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { if (!isSaved) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                      onMouseLeave={e => { if (!isSaved) e.currentTarget.style.background = 'rgba(0,0,0,0.6)' }}
                    >
                      {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Sub/Dub toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          {/* Sub/Dub Pill Select */}
          <div style={{
            display: 'flex', padding: '3px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', gap: '2px'
          }}>
            <button
              onClick={() => setIsDub(false)}
              style={{
                padding: '0.4rem 0.85rem', border: 'none', borderRadius: '9px',
                background: !isDub ? 'rgba(244,117,33,0.18)' : 'transparent',
                color: !isDub ? '#f47521' : '#94a3b8',
                fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              🇯🇵 Subbed
            </button>
            <button
              onClick={() => setIsDub(true)}
              style={{
                padding: '0.4rem 0.85rem', border: 'none', borderRadius: '9px',
                background: isDub ? 'rgba(244,117,33,0.18)' : 'transparent',
                color: isDub ? '#f47521' : '#94a3b8',
                fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              🇺🇸 Dubbed
            </button>
          </div>
        </div>

        {/* Version Matches Shelf */}
        {gogoSearchData?.results?.length > 1 && (
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
              Select Stream Version Match
            </h4>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
              {gogoSearchData.results.slice(0, 5).map((item) => {
                const isActive = item.id === selectedGogoId
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedGogoId(item.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '90px',
                      flexShrink: 0,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '2/3',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isActive ? '2px solid #f47521' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive ? '0 0 12px rgba(244,117,33,0.35)' : 'none',
                      transition: 'all 0.2s ease',
                      marginBottom: '6px'
                    }}>
                      {item.image ? (
                        <Image src={item.image} alt={item.title} fill sizes="90px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c2e', color: '#64748b' }}>🎬</div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#f47521' : '#94a3b8',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2
                    }}>
                      {item.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Synopsis */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}><Info size={16} color="#f47521" /> Synopsis</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {cleanDescription}
          </p>
        </div>

        {/* Meta Grid */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem',
          padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2.5rem'
        }}>
          {animeData.studios?.nodes?.[0]?.name && (
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}><Users size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Studio</span>
              <strong style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>{animeData.studios.nodes[0].name}</strong>
            </div>
          )}
          {animeData.seasonYear && (
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}><Calendar size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Premiered</span>
              <strong style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>{animeData.season} {animeData.seasonYear}</strong>
            </div>
          )}
          {animeData.genres && (
            <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Genres</span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {animeData.genres.map(g => (
                  <span key={g} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(244,117,33,0.1)', color: '#f47521', border: '1px solid rgba(244,117,33,0.2)' }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Episode List Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Tv size={16} color="#f47521" /> Episodes</h3>
          
          {searchLoading || infoLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <LoadingSpinner />
            </div>
          ) : !selectedGogoId ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>😿</div>
              <h4 style={{ color: '#cbd5e1', margin: 0, fontWeight: 700 }}>No stream source found</h4>
              <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>This anime may not be released or cataloged on GogoAnime yet.</p>
            </div>
          ) : gogoInfo?.episodes?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
              <h4 style={{ color: '#cbd5e1', margin: 0, fontWeight: 700 }}>Episodes Coming Soon</h4>
              <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>Episodes list is empty. Check back later!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
              {sortedEpisodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/anime/watch/${ep.id}?malId=${animeData.idMal || ''}&ep=${ep.episodeNumber}&anilistId=${animeId}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.6rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 117, 33, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(244, 117, 33, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    {/* Episode Still (using the anime cover image as thumbnail) */}
                    <div style={{ width: '80px', height: '45px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#1c1c2e' }}>
                      {animeData.coverImage?.large ? (
                        <Image src={animeData.coverImage.large} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#64748b' }}>🎬</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Episode {ep.episodeNumber}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 800, color: '#f47521' }}>
                          Play <Play size={9} fill="#f47521" stroke="none" />
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Watch episode {ep.episodeNumber} in high definition subbed or dubbed.
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(244,117,33,0.3);
          border-radius: 99px;
        }
      `}</style>
    </div>
  )
}
