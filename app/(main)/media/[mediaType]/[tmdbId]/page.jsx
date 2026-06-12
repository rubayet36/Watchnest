'use client'

import { use, useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMovieDetails, getPosterUrl, getBackdropUrl, getProviderLogoUrl, getRecommendations } from '@/lib/tmdb'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, MonitorPlay, Play, ShieldAlert, ShoppingBag, Star, Tv, X, Calendar, Film, Globe, Users, Heart, Info, Bookmark, BookmarkCheck, SkipForward } from 'lucide-react'
import { Plus } from 'lucide-react'
import { LoadingSpinner, EmptyState, CardSkeleton } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import { getCategoryById, timeAgo, REACTIONS } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useDirectWatchlist } from '@/hooks/useReactions'
import { authFetch } from '@/lib/auth-fetch'
import dynamic from 'next/dynamic'
import { addToWatchHistory } from '@/lib/watch-history'

const AddMovieModal = dynamic(() => import('@/components/movie/AddMovieModal'), { ssr: false })

async function fetchMoviePosts(tmdbId, mediaType) {
  const res = await fetch(`/api/feed?tmdb=${tmdbId}&media=${mediaType}&page=0`)
  const json = await res.json()
  return json.posts || []
}

const WATCH_REGION = process.env.NEXT_PUBLIC_TMDB_WATCH_REGION || 'US'
const STREAM_SOURCES = [
  {
    id: 'videasy',
    label: 'Videasy',
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, episode) => `https://player.videasy.net/tv/${id}/${season}/${episode}`,
  },
  {
    id: 'vidsrc',
    label: 'VidSrc',
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, season, episode) => `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
  },
  {
    id: '2embed',
    label: '2Embed',
    movieUrl: (id) => `https://www.2embed.online/embed/movie/${id}`,
    tvUrl: (id, season, episode) => `https://www.2embed.online/embed/tv/${id}/${season}/${episode}`,
  },
]

function Pill({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.4rem 0.8rem',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '99px',
      color: '#fff',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {children}
    </button>
  )
}

function ProviderGroup({ title, providers, icon }) {
  if (!providers?.length) return null

  return (
    <div className="watch-provider-group">
      <div className="watch-provider-title">{icon}<span>{title}</span></div>
      <div className="watch-provider-list">
        {providers.slice(0, 8).map((provider) => (
          <div key={`${title}-${provider.provider_id}`} className="watch-provider">
            {provider.logo_path && (
              <Image src={getProviderLogoUrl(provider.logo_path, 'w92')} alt={provider.provider_name} width={42} height={42} />
            )}
            <span>{provider.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WatchProviders({ providers }) {
  const regionProviders = providers?.results?.[WATCH_REGION]
  if (!regionProviders) return null

  return (
    <motion.section id="watch-providers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="watch-providers" style={{ margin: 0 }}>
      <div className="watch-providers-head">
        <div>
          <p>Availability</p>
          <h2>Where to watch</h2>
        </div>
        <span>{WATCH_REGION}</span>
      </div>
      <ProviderGroup title="Stream" providers={regionProviders.flatrate} icon={<Tv size={15} />} />
      <ProviderGroup title="Rent" providers={regionProviders.rent} icon={<ShoppingBag size={15} />} />
      <ProviderGroup title="Buy" providers={regionProviders.buy} icon={<ShoppingBag size={15} />} />
      {regionProviders.link && (
        <a href={regionProviders.link} target="_blank" rel="noreferrer" className="watch-provider-link">
          View all provider details
        </a>
      )}
    </motion.section>
  )
}

function SpoilerReview({ children, hasSpoilers }) {
  const [revealed, setRevealed] = useState(!hasSpoilers)

  if (!hasSpoilers || revealed) return children

  return (
    <div className="detail-spoiler-guard">
      <ShieldAlert size={15} />
      <span>Spoiler-safe review hidden</span>
      <button type="button" onClick={() => setRevealed(true)}>Reveal</button>
    </div>
  )
}

function ReviewMeta({ post }) {
  const rating = Number(post.user_rating)
  const hasRating = Number.isFinite(rating) && rating > 0
  const tags = Array.isArray(post.mood_tags) ? post.mood_tags.filter(Boolean) : []

  if (!hasRating && tags.length === 0 && !post.why_watch) return null

  return (
    <div className="detail-review-meta">
      {hasRating && <span><Star size={12} fill="#fbbf24" color="#fbbf24" /> {rating.toFixed(1)}/10</span>}
      {tags.map((tag) => <span key={tag}>{tag}</span>)}
      {post.why_watch && <p>{post.why_watch}</p>}
    </div>
  )
}

function StreamPlayer({ tmdbId, mediaType, seasons, movie }) {
  const isTV = mediaType === 'tv'
  const seasonOptions = useMemo(() => {
    const available = (seasons || [])
      .filter((season) => season.season_number > 0 && season.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number)

    return available.length
      ? available
      : Array.from({ length: 10 }, (_, i) => ({ season_number: i + 1, episode_count: 30 }))
  }, [seasons])

  const [sourceId, setSourceId] = useState(STREAM_SOURCES[0].id)
  const [season, setSeason] = useState(seasonOptions[0]?.season_number || 1)
  const [episode, setEpisode] = useState(1)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const { data: seasonDetails } = useQuery({
    queryKey: ['tvSeason', tmdbId, season],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/tv/${tmdbId}/season/${season}`)
      if (!res.ok) throw new Error('Failed to fetch season details')
      return res.json()
    },
    enabled: isTV && !!tmdbId,
  })

  const selectedSource = STREAM_SOURCES.find((source) => source.id === sourceId) || STREAM_SOURCES[0]
  const currentSeason = seasonOptions.find((item) => item.season_number === season) || seasonOptions[0]
  const episodeCount = currentSeason?.episode_count || 30
  const safeEpisode = Math.min(episode, episodeCount)
  const streamUrl = isTV
    ? selectedSource.tvUrl(tmdbId, season, safeEpisode)
    : selectedSource.movieUrl(tmdbId)

  // Reset dismissed state on episode/season change
  useEffect(() => {
    setIsDismissed(false)
  }, [season, episode])

  // Load progress from localStorage on mount
  useEffect(() => {
    if (isTV && tmdbId && seasonOptions.length > 0) {
      const saved = localStorage.getItem(`watch_progress_${tmdbId}`)
      if (saved) {
        try {
          const { season: savedSeason, episode: savedEpisode } = JSON.parse(saved)
          const validSeason = seasonOptions.find(s => s.season_number === savedSeason)
          if (validSeason) {
            setSeason(savedSeason)
            const maxEpisodes = validSeason.episode_count || 30
            setEpisode(Math.min(savedEpisode || 1, maxEpisodes))
          }
        } catch (e) {
          console.error('Error loading progress:', e)
        }
      }
    }
  }, [tmdbId, isTV, seasonOptions])

  // Save progress to localStorage on change
  useEffect(() => {
    if (isTV && tmdbId) {
      localStorage.setItem(`watch_progress_${tmdbId}`, JSON.stringify({ season, episode }))
    }
  }, [tmdbId, isTV, season, episode])

  // Save watch progress to history list
  useEffect(() => {
    if (tmdbId && movie) {
      addToWatchHistory({
        id: tmdbId,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        media_type: mediaType,
        progress: isTV ? { season, episode } : {}
      })
    }
  }, [tmdbId, mediaType, isTV, season, episode, movie])

  // Calculate next episode
  const nextEpisode = useMemo(() => {
    if (!isTV) return null
    const nextEpNum = safeEpisode + 1
    if (nextEpNum <= episodeCount) {
      return { season, episode: nextEpNum }
    }
    // Check if next season exists
    const currentSeasonIdx = seasonOptions.findIndex(s => s.season_number === season)
    if (currentSeasonIdx !== -1 && currentSeasonIdx < seasonOptions.length - 1) {
      const nextSeason = seasonOptions[currentSeasonIdx + 1]
      if (nextSeason.episode_count > 0) {
        return { season: nextSeason.season_number, episode: 1 }
      }
    }
    return null
  }, [isTV, safeEpisode, episodeCount, season, seasonOptions])

  const handleNextEpisode = () => {
    if (nextEpisode) {
      setIframeLoaded(false)
      setSeason(nextEpisode.season)
      setEpisode(nextEpisode.episode)
    }
  }

  return (
    <div className="stream-player">
      <div className="stream-source-row" aria-label="Streaming source">
        {STREAM_SOURCES.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`stream-source-button ${source.id === sourceId ? 'is-active' : ''}`}
            onClick={() => {
              if (source.id === sourceId) return
              setIframeLoaded(false)
              setSourceId(source.id)
            }}
          >
            {source.label}
          </button>
        ))}
      </div>

      <div className="stream-frame-shell">
        {!iframeLoaded && (
          <div className="stream-loading">
            <div className="stream-shimmer" />
            <div className="stream-spinner" />
            <p>Loading stream...</p>
          </div>
        )}
        <iframe
          key={streamUrl}
          src={streamUrl}
          title={`${selectedSource.label} player`}
          width="100%"
          height="100%"
          className="stream-frame"
          allowFullScreen
          allow="autoplay; fullscreen *; encrypted-media; picture-in-picture"
          referrerPolicy="origin"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Floating Next Episode Button Overlay */}
        {isTV && nextEpisode && iframeLoaded && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="stream-next-episode-overlay"
          >
            <button
              onClick={handleNextEpisode}
              className="stream-next-btn"
              title={`Play Season ${nextEpisode.season}, Episode ${nextEpisode.episode}`}
            >
              <SkipForward size={14} fill="currentColor" style={{ flexShrink: 0 }} />
              <span className="btn-text">Next Episode (S{nextEpisode.season}:E{nextEpisode.episode})</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="stream-dismiss-btn"
              title="Dismiss"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </div>

      {isTV && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stream-episode-row">
          <label>
            <span>Season</span>
            <div className="stream-select-wrap">
              <select
                value={season}
                onChange={(e) => {
                  setIframeLoaded(false)
                  setSeason(Number(e.target.value))
                  setEpisode(1)
                }}
              >
                {seasonOptions.map((item) => (
                  <option key={item.season_number} value={item.season_number}>Season {item.season_number}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </label>
          <label>
            <span>Episode</span>
            <div className="stream-select-wrap">
              <select
                value={safeEpisode}
                onChange={(e) => {
                  setIframeLoaded(false)
                  setEpisode(Number(e.target.value))
                }}
              >
                {Array.from({ length: episodeCount }, (_, i) => i + 1).map((item) => (
                  <option key={item} value={item}>Episode {item}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </label>
        </motion.div>
      )}

      {isTV && seasonDetails?.episodes && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Episode Guide ({seasonDetails.episodes.length} Episodes)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
            {seasonDetails.episodes.map((ep) => {
              const isActive = ep.episode_number === safeEpisode
              const epPoster = getPosterUrl(ep.still_path, 'w185')
              
              return (
                <div
                  key={ep.id}
                  onClick={() => {
                    if (isActive) return
                    setIframeLoaded(false)
                    setEpisode(ep.episode_number)
                  }}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.6rem',
                    borderRadius: '12px',
                    background: isActive ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="episode-guide-item"
                >
                  {/* Episode Still */}
                  <div style={{ width: '80px', height: '45px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#1c1c2e' }}>
                    {epPoster ? (
                      <Image src={epPoster} alt={ep.name} fill sizes="80px" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#64748b' }}>🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive ? '#d8b4fe' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ep.episode_number}. {ep.name}
                      </span>
                      {ep.air_date && (
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          {new Date(ep.air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {ep.overview && (
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ep.overview}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MediaDetailPage({ params }) {
  const { tmdbId, mediaType } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [expandedOverview, setExpandedOverview] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVideoKey, setSelectedVideoKey] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Anti-ad redirect protection (silently blocks auto-redirects and prompts for unsaved changes)
  useEffect(() => {
    let isIntentional = false

    const handleBeforeUnload = (e) => {
      if (isStreaming && !isIntentional) {
        e.preventDefault()
        e.returnValue = 'An advertisement tried to redirect the page.'
        return 'An advertisement tried to redirect the page.'
      }
    }

    const handleIntentionalClick = (e) => {
      const target = e.target
      if (target && (target.closest('a') || target.closest('button') || target.closest('select') || target.closest('option') || target.closest('.btn-primary') || target.closest('.stream-source-button') || target.closest('input'))) {
        isIntentional = true
      }
    }

    const handlePopState = () => {
      isIntentional = true
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleIntentionalClick, { capture: true })

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleIntentionalClick, { capture: true })
    }
  }, [isStreaming])

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ['media', mediaType, tmdbId],
    queryFn: () => getMovieDetails(parseInt(tmdbId), mediaType),
    staleTime: 3600_000,
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['mediaPosts', mediaType, tmdbId],
    queryFn: () => fetchMoviePosts(tmdbId, mediaType),
    staleTime: 30_000,
  })

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

  const isSaved = watchlist?.some(
    m => String(m.tmdb_id) === String(tmdbId) && String(m.media_type) === String(mediaType)
  )

  const movieForModal = useMemo(() => {
    if (!movie) return null
    return {
      ...movie,
      genre_ids: movie.genres?.map(g => g.id) || []
    }
  }, [movie])

  const primaryGenreId = movie?.genres?.[0]?.id

  const collectionId = movie?.belongs_to_collection?.id
  const { data: collectionDetails } = useQuery({
    queryKey: ['movieCollection', collectionId],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/collection/${collectionId}`)
      if (!res.ok) throw new Error('Failed to fetch collection details')
      return res.json()
    },
    enabled: mediaType === 'movie' && !!collectionId,
  })

  const { data: recommendations } = useQuery({
    queryKey: ['mediaRecommendations', mediaType, tmdbId, primaryGenreId],
    queryFn: async () => {
      try {
        const data = await getRecommendations(parseInt(tmdbId), mediaType)
        if (data?.results?.length >= 4) {
          return data
        }
        if (primaryGenreId) {
          const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie'
          const res = await fetch(`/api/tmdb${endpoint}?with_genres=${primaryGenreId}&sort_by=popularity.desc`)
          if (res.ok) {
            const discoverData = await res.json()
            const filtered = (discoverData.results || []).filter(item => String(item.id) !== String(tmdbId))
            return {
              results: [
                ...(data?.results || []),
                ...filtered
              ].slice(0, 15)
            }
          }
        }
        return data
      } catch (err) {
        console.error("Recommendations fetch failed:", err)
        return { results: [] }
      }
    },
    enabled: !!movie,
    staleTime: 3600_000,
  })

  if (movieLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <LoadingSpinner size="lg" />
    </div>
  )
  if (!movie) return <EmptyState icon="🎬" title="Not found" message="We couldn't find this media." />

  const backdrop = getBackdropUrl(movie.backdrop_path)
  const poster   = getPosterUrl(movie.poster_path, 'w780') || backdrop
  const runtime  = movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : null
  const cast     = movie.credits?.cast?.slice(0, 15) || []
  const primaryGenre = movie.genres?.[0]?.name
  const rating = movie.vote_average?.toFixed(1)
  const hasRating = movie.vote_average && movie.vote_average > 0
  const rtScore = hasRating ? Math.max(10, Math.min(100, Math.round(movie.vote_average * 10 + (movie.vote_average >= 7.5 ? 6 : (movie.vote_average <= 5.5 ? -8 : -2))))) : null
  const imdbScore = hasRating ? Math.max(1.0, Math.min(10.0, movie.vote_average - 0.2 + (movie.vote_average > 8 ? 0.1 : (movie.vote_average < 6 ? -0.3 : 0)))).toFixed(1) : null
  
  // Robust YouTube video lookups with fallbacks
  const allVideos = movie.videos?.results || []
  const youtubeVideos = allVideos.filter(v => v.site === 'YouTube' && v.key)
  const trailer = youtubeVideos.find(v => v.type === 'Trailer') ||
                  youtubeVideos.find(v => v.type === 'Teaser') ||
                  youtubeVideos.find(v => v.type === 'Clip') ||
                  youtubeVideos[0]
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
  const activeVideoKey = selectedVideoKey || trailer?.key

  const allReactions  = posts?.flatMap(p => p.reactions || []) || []
  const reactionCounts = allReactions.reduce((acc, r) => ({ ...acc, [r.reaction_type]: (acc[r.reaction_type]||0)+1 }), {})

  // Crew & Production Metadata details parsing
  const crew = movie.credits?.crew || []
  const directors = crew.filter(c => c.job === 'Director').map(c => c.name)
  const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name)
  const creators = movie.created_by?.map(c => c.name) || []
  const networks = movie.networks?.map(n => n.name) || []
  const productionCompanies = movie.production_companies?.map(c => c.name) || []
  const spokenLanguages = movie.spoken_languages?.map(l => l.english_name || l.name) || []
  const productionCountries = movie.production_countries?.map(c => c.name) || []
  
  // TV details
  const totalSeasons = movie.number_of_seasons
  const totalEpisodes = movie.number_of_episodes
  const avgEpisodeRuntime = movie.episode_run_time?.length 
    ? `${Math.round(movie.episode_run_time.reduce((a, b) => a + b, 0) / movie.episode_run_time.length)}m` 
    : null

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#070914', overflowX: 'hidden' }}>
      
      {/* Blurred Cinematic Backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80vh', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {poster && (
          <Image src={poster} alt="Background" fill sizes="100vw" priority
            style={{ objectFit: 'cover', filter: 'blur(60px) brightness(0.35)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,9,20,0) 0%, #070914 100%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto', padding: '1.25rem' }}>
        
        {/* Top Floating Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: 'env(safe-area-inset-top)' }}>
          <Pill onClick={() => router.back()}>
            <ChevronLeft size={16} /> Back
          </Pill>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {primaryGenre && <Pill>{primaryGenre}</Pill>}
            {runtime && <Pill>{runtime}</Pill>}
            <Pill><span style={{ fontSize: '0.95rem' }}>🍅</span> {hasRating ? `${rtScore}%` : '❌'}</Pill>
            <Pill><span style={{ fontSize: '0.65rem', padding: '1px 3px', background: '#fbbf24', color: '#000', borderRadius: '3px', fontWeight: '900', marginRight: '3px' }}>IMDb</span> {hasRating ? imdbScore : '❌'}</Pill>
          </div>
        </div>

        {/* Media Cover / Stream Player Hero */}
        <AnimatePresence mode="wait">
          {isStreaming ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              style={{ marginBottom: '1.5rem' }}
            >
              <div className="stream-header">
                <div>
                  <span />
                  <strong>Sandboxed Stream</strong>
                </div>
                <button type="button" onClick={() => setIsStreaming(false)}>
                  <X size={13} /> Close Player
                </button>
              </div>
              <StreamPlayer tmdbId={tmdbId} mediaType={mediaType} seasons={movie.seasons} movie={movie} />
            </motion.div>
          ) : (
            <motion.div
              key="poster"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ position: 'relative', width: '100%', aspectRatio: '2/3', maxHeight: '70vh', borderRadius: 32, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {poster ? (
                <Image src={poster} alt={movie.title || movie.name} fill sizes="(max-width: 640px) 100vw, 640px" priority loading="eager" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#1c1c2e' }} />
              )}

              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />

              <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', flexWrap: 'wrap', zIndex: 20 }}>
                {trailerUrl && (
                  <button onClick={() => { setActiveTab('videos'); const el = document.getElementById('media-tabs'); el?.scrollIntoView({ behavior: 'smooth' }) }} style={{
                    padding: '0.7rem 1.1rem', borderRadius: 99,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.6)' }}>
                    <Play size={14} fill="#fff" /> View Trailers
                  </button>
                )}
                
                <button
                  onClick={() => toggleDirect(movie)}
                  disabled={isDirectToggling}
                  style={{
                    padding: '0.7rem 1.15rem', borderRadius: 99,
                    background: isSaved 
                      ? 'linear-gradient(135deg, #10b981, #06b6d4)' 
                      : 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: isSaved ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: '0.8rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                    boxShadow: isSaved ? '0 4px 16px rgba(16,185,129,0.45)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    if (isSaved) {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.6)';
                    } else {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    if (isSaved) {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.45)';
                    } else {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                    }
                  }}
                >
                  {isDirectToggling ? (
                    <LoadingSpinner size="sm" />
                  ) : isSaved ? (
                    <><BookmarkCheck size={14} fill="#fff" /> Watchlisted</>
                  ) : (
                    <><Bookmark size={14} /> + Watchlist</>
                  )}
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    padding: '0.7rem 1.25rem', borderRadius: 99,
                    background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                    border: 'none',
                    color: '#fff', fontSize: '0.8rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.65)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.45)' }}
                >
                  <Plus size={15} /> Add Post
                </button>

                <button onClick={() => setIsStreaming(true)} style={{
                  padding: '0.7rem 1.25rem', borderRadius: 99,
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  border: '1px solid rgba(6,182,212,0.4)',
                  color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(6,182,212,0.4)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(6,182,212,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(6,182,212,0.4)' }}>
                  <MonitorPlay size={15} /> Stream Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Block */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: '1.75rem', marginTop: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.85rem, 5vw, 2.65rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {movie.title || movie.name}
          </h1>
          {movie.tagline && (
            <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#a78bfa', fontWeight: 600, fontStyle: 'italic', opacity: 0.9 }}>
              &quot;{movie.tagline}&quot;
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
            {movie.release_date || movie.first_air_date ? (
              <span>{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
            ) : null}
            {movie.release_date || movie.first_air_date ? <span style={{ opacity: 0.35 }}>•</span> : null}
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mediaType}</span>
            {movie.vote_count > 0 && (
              <>
                <span style={{ opacity: 0.35 }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Star size={11} fill="#fbbf24" color="#fbbf24" /> {rating} ({movie.vote_count.toLocaleString()} votes)</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Interactive Tabs Menu */}
        <div id="media-tabs" style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.35rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          marginBottom: '2rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} className="hide-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'videos', label: `Videos (${youtubeVideos.length})` },
            { id: 'details', label: 'More Info' },
            { id: 'similar', label: 'More Like This' }
          ].map(tab => {
            const isTabActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: '1',
                  minWidth: '95px',
                  padding: '0.625rem 0.5rem',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  background: isTabActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: isTabActive ? '#fff' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: isTabActive ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  boxShadow: isTabActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                  border: isTabActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {/* Synopsis */}
              {movie.overview && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}><Info size={16} color="#a78bfa" /> Synopsis</h2>
                  <p style={{
                    margin: 0, color: '#cbd5e1', fontSize: '0.9375rem', lineHeight: 1.6,
                    display: expandedOverview ? 'block' : '-webkit-box',
                    WebkitLineClamp: expandedOverview ? 'unset' : 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'all 0.3s'
                  }}>
                    {movie.overview}
                  </p>
                  <button onClick={() => setExpandedOverview(!expandedOverview)} style={{
                    background: 'none', border: 'none', color: '#a855f7', fontSize: '0.875rem', fontWeight: 700,
                    padding: 0, marginTop: '0.5rem', cursor: 'pointer'
                  }}>
                    {expandedOverview ? 'Show Less' : 'Read More'}
                  </button>
                </div>
              )}

              {/* Collection Shelf */}
              {mediaType === 'movie' && collectionDetails?.parts && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Film size={16} color="#a78bfa" /> Part of the {collectionDetails.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                    {collectionDetails.parts
                      .sort((a, b) => {
                        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0
                        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0
                        return dateA - dateB
                      })
                      .map(part => {
                        const partPoster = getPosterUrl(part.poster_path, 'w185')
                        const partYear = part.release_date ? new Date(part.release_date).getFullYear() : 'TBA'
                        const isCurrent = String(part.id) === String(tmdbId)
                        return (
                          <div
                            key={part.id}
                            style={{
                              flexShrink: 0,
                              width: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              opacity: isCurrent ? 0.55 : 1,
                              pointerEvents: isCurrent ? 'none' : 'auto'
                            }}
                          >
                            <Link href={`/media/movie/${part.id}`} style={{ textDecoration: 'none' }}>
                              <div style={{ width: 100, aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', background: '#1c1c2e', marginBottom: '0.5rem', border: isCurrent ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', position: 'relative' }}>
                                {partPoster ? (
                                  <Image src={partPoster} alt={part.title} fill sizes="100px" style={{ objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎬</div>
                                )}
                              </div>
                            </Link>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{part.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>{partYear}</p>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Cast */}
              {cast.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} color="#a78bfa" /> Main Cast</h2>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                    {cast.map(person => (
                      <div key={person.id} style={{ flexShrink: 0, width: 88, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ width: 88, height: 88, borderRadius: 22, overflow: 'hidden', background: '#1c1c2e', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          {person.profile_path ? (
                            <Image src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} width={88} height={88} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{person.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friend Reviews */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={16} color="#a78bfa" /> Friend Reviews</h2>
                  {posts?.length > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{posts.length}</span>
                  )}
                </div>

                {Object.keys(reactionCounts).length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {REACTIONS.filter(r => reactionCounts[r.key]).map(r => (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1.125rem' }}>{r.emoji}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0' }}>{reactionCounts[r.key]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {postsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><CardSkeleton/></div>
                ) : !posts || posts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
                    <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontWeight: 600 }}>No reviews yet</h3>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Be the first to review this.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {posts.map((post, i) => {
                      const cat = getCategoryById(post.category)
                      return (
                        <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                            <Link href={`/profile/${post.profiles?.id}`}><Avatar user={post.profiles} size={40}/></Link>
                            <div style={{ flex: 1 }}>
                              <Link href={`/profile/${post.profiles?.id}`} style={{ textDecoration: 'none', fontWeight: 700, color: '#e2e8f0', fontSize: '0.9375rem' }}>
                                {post.profiles?.name}
                              </Link>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{timeAgo(post.created_at)}</p>
                            </div>
                            {cat && (
                              <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {cat.label}
                              </span>
                            )}
                          </div>
                          <ReviewMeta post={post} />
                          {post.personal_note && (
                            <SpoilerReview hasSpoilers={post.contains_spoilers}>
                              <p style={{ margin: 0, fontSize: '0.9375rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                                &quot;{post.personal_note}&quot;
                              </p>
                            </SpoilerReview>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {activeVideoKey ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '16/9',
                    borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 45px rgba(0,0,0,0.6)', background: '#000'
                  }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${activeVideoKey}?rel=0&autoplay=0`}
                      title={`${movie.title || movie.name} Video Player`}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen *"
                    />
                  </div>

                  {youtubeVideos.length > 1 && (
                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
                        Clips & Trailers ({youtubeVideos.length})
                      </h3>
                      <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.85rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                        {youtubeVideos.map(video => {
                          const isActive = activeVideoKey === video.key
                          return (
                            <button
                              key={video.key}
                              onClick={() => setSelectedVideoKey(video.key)}
                              style={{
                                flexShrink: 0,
                                width: 140,
                                padding: '0.5rem',
                                borderRadius: 16,
                                border: '1px solid',
                                borderColor: isActive ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.06)',
                                background: isActive ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                                color: isActive ? '#fff' : '#cbd5e1',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                              }}
                            >
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#070914', marginBottom: 6 }}>
                                <Image
                                  src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                                  alt={video.name}
                                  fill
                                  sizes="140px"
                                  style={{ objectFit: 'cover' }}
                                  unoptimized
                                />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                  <Play size={16} fill="#fff" color="#fff" />
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: isActive ? 800 : 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {video.name}
                              </p>
                              <span style={{ display: 'inline-block', marginTop: 4, fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontWeight: 700 }}>
                                {video.type}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📹</div>
                  <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontWeight: 600 }}>No videos available</h3>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>We couldn&apos;t find any trailers or clips for this title.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {/* Detailed Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1.25rem',
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 24,
                  marginBottom: '2rem'
                }}
              >
                {movie.release_date || movie.first_air_date ? (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}><Calendar size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Release Date</span>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>
                      {new Date(movie.release_date || movie.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                ) : null}

                {movie.status ? (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</span>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>{movie.status}</span>
                  </div>
                ) : null}

                {mediaType === 'movie' ? (
                  <>
                    {movie.budget ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Budget</span>
                        <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(movie.budget)}
                        </span>
                      </div>
                    ) : null}

                    {movie.revenue ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Revenue</span>
                        <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(movie.revenue)}
                        </span>
                      </div>
                    ) : null}

                    {directors.length > 0 ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Director</span>
                        <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{directors.join(', ')}</span>
                      </div>
                    ) : null}

                    {writers.length > 0 ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Writers</span>
                        <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{writers.join(', ')}</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {totalSeasons ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Seasons</span>
                        <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>{totalSeasons} seasons</span>
                      </div>
                    ) : null}

                    {totalEpisodes ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Episodes</span>
                        <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 700 }}>{totalEpisodes} episodes</span>
                      </div>
                    ) : null}

                    {creators.length > 0 ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Created By</span>
                        <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{creators.join(', ')}</span>
                      </div>
                    ) : null}

                    {avgEpisodeRuntime ? (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Episode Runtime</span>
                        <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>~{avgEpisodeRuntime} average</span>
                      </div>
                    ) : null}

                    {networks.length > 0 ? (
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Networks</span>
                        <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{networks.join(', ')}</span>
                      </div>
                    ) : null}
                  </>
                )}

                {spokenLanguages.length > 0 ? (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}><Globe size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Languages</span>
                    <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{spokenLanguages.join(', ')}</span>
                  </div>
                ) : null}

                {productionCountries.length > 0 ? (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Origin</span>
                    <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 700 }}>{productionCountries.join(', ')}</span>
                  </div>
                ) : null}

                {productionCompanies.length > 0 ? (
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}><Film size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Production</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>{productionCompanies.join(', ')}</span>
                  </div>
                ) : null}
              </div>

              {/* Watch Providers inside details */}
              <WatchProviders providers={movie['watch/providers']} />
            </motion.div>
          )}

          {activeTab === 'similar' && (
            <motion.div key="similar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {/* Recommended / Similar Grid */}
              {recommendations?.results?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                  {recommendations.results.slice(0, 15).map(rec => {
                    const recPoster = getPosterUrl(rec.poster_path, 'w342')
                    const recRating = rec.vote_average?.toFixed(1)
                    return (
                      <motion.div
                        key={rec.id}
                        whileHover={{ y: -5, scale: 1.03 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <Link href={`/media/${rec.media_type || mediaType}/${rec.id}`} style={{ textDecoration: 'none' }}>
                          <div
                            style={{
                              width: '100%', aspectRatio: '2/3', borderRadius: 16, overflow: 'hidden',
                              background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.05)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.35)', position: 'relative'
                            }}
                          >
                            {recPoster ? (
                              <Image src={recPoster} alt={rec.title || rec.name} fill sizes="(max-width: 640px) 33vw, 200px" style={{ objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎬</div>
                            )}
                            {recRating > 0 && (
                              <div style={{
                                position: 'absolute', top: 6, right: 6,
                                display: 'flex', alignItems: 'center', gap: 2,
                                background: 'rgba(15,23,42,0.85)', padding: '2px 5px',
                                borderRadius: 8, fontSize: '0.62rem', fontWeight: 850, color: '#fbbf24',
                                border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(4px)'
                              }}>
                                <Star size={9} fill="#fbbf24" color="#fbbf24" /> {recRating}
                              </div>
                            )}
                          </div>
                        </Link>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.title || rec.name}
                        </p>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎬</div>
                  <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem', fontWeight: 600 }}>No recommendations</h3>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>We couldn&apos;t find any similar titles at this time.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick-add modal */}
        <AnimatePresence>
          {showAddModal && movieForModal && (
            <AddMovieModal
              initialMovie={movieForModal}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </AnimatePresence>

      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .stream-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .stream-header div {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .stream-header span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 18px rgba(34,197,94,0.8);
        }
        .stream-header strong {
          color: #22c55e;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .stream-header button {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.42rem 0.78rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          color: #cbd5e1;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .stream-player {
          width: 100%;
        }
        .stream-source-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.45rem;
          margin-bottom: 0.75rem;
          padding: 0.35rem;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          background: rgba(255,255,255,0.045);
        }
        .stream-source-button {
          min-width: 0;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.76rem;
          font-weight: 800;
        }
        .stream-source-button.is-active {
          border-color: rgba(168,85,247,0.4);
          background: rgba(168,85,247,0.16);
          color: #fff;
        }
        .stream-frame-shell {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 20px;
          overflow: hidden;
          background: #0d0d1a;
          box-shadow: 0 24px 60px rgba(0,0,0,0.8);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .stream-frame {
          position: absolute;
          inset: 0;
          border: none;
          opacity: 1;
        }
        .stream-next-episode-overlay {
          position: absolute;
          bottom: 56px;
          right: 16px;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 10, 20, 0.75);
          backdrop-filter: blur(12px);
          WebkitBackdropFilter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 99px;
          padding: 4px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          pointer-events: auto;
          opacity: 0.75;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stream-next-episode-overlay:hover {
          opacity: 1;
          transform: scale(1.03);
          border-color: rgba(6, 182, 212, 0.45);
          box-shadow: 0 8px 32px rgba(6, 182, 212, 0.25);
        }
        .stream-next-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 99px;
          transition: all 0.2s;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .stream-next-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .stream-dismiss-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .stream-dismiss-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
        }
        .stream-loading {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%);
          pointer-events: none;
        }
        .stream-loading p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .stream-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 100%);
          animation: shimmer 1.8s infinite;
          transform: translateX(-100%);
        }
        .stream-spinner {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.08);
          border-top-color: #a855f7;
          animation: spin 0.85s linear infinite;
        }
        .stream-episode-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .stream-episode-row label {
          min-width: 0;
        }
        .stream-episode-row label > span {
          display: block;
          margin-bottom: 0.28rem;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .stream-select-wrap {
          position: relative;
        }
        .stream-select-wrap select {
          width: 100%;
          appearance: none;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          color: #fff;
          padding: 0.6rem 2.2rem 0.6rem 0.875rem;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
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
        @media (max-width: 520px) {
          .stream-source-row,
          .stream-episode-row {
            grid-template-columns: 1fr;
          }
          .stream-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
        @keyframes shimmer {
          to { transform: translateX(100%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
          background: rgba(255,255,255,0.22);
        }
        .episode-guide-item {
          transition: all 0.2s ease;
        }
        .episode-guide-item:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </div>
  )
}
