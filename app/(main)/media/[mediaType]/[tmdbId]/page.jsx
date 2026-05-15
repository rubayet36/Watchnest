'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMovieDetails, getPosterUrl, getBackdropUrl, getProviderLogoUrl } from '@/lib/tmdb'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Play, ShieldAlert, ShoppingBag, Star, Tv } from 'lucide-react'
import { LoadingSpinner, EmptyState, CardSkeleton } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import { getCategoryById, timeAgo, REACTIONS } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

async function fetchMoviePosts(tmdbId, mediaType) {
  const res = await fetch(`/api/feed?tmdb=${tmdbId}&media=${mediaType}&page=0`)
  const json = await res.json()
  return json.posts || []
}

const WATCH_REGION = process.env.NEXT_PUBLIC_TMDB_WATCH_REGION || 'US'

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
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }} className="watch-providers">
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
      {hasRating && <span><Star size={12} /> {rating.toFixed(1)}/10</span>}
      {tags.map((tag) => <span key={tag}>{tag}</span>)}
      {post.why_watch && <p>{post.why_watch}</p>}
    </div>
  )
}

export default function MediaDetailPage({ params }) {
  const { tmdbId, mediaType } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [expandedOverview, setExpandedOverview] = useState(false)

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

  if (movieLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <LoadingSpinner size="lg" />
    </div>
  )
  if (!movie) return <EmptyState icon="🎬" title="Not found" message="We couldn't find this media." />

  const backdrop = getBackdropUrl(movie.backdrop_path)
  const poster   = getPosterUrl(movie.poster_path, 'w780') || backdrop
  const runtime  = movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : null
  const cast     = movie.credits?.cast?.slice(0, 10) || []
  const primaryGenre = movie.genres?.[0]?.name
  const rating = movie.vote_average?.toFixed(1)
  
  const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null

  const allReactions  = posts?.flatMap(p => p.reactions || []) || []
  const reactionCounts = allReactions.reduce((acc, r) => ({ ...acc, [r.reaction_type]: (acc[r.reaction_type]||0)+1 }), {})

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#0a0a14', overflowX: 'hidden' }}>
      
      {/* Blurred Backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80vh', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {poster && (
          <Image src={poster} alt="Background" fill sizes="100vw" priority
            style={{ objectFit: 'cover', filter: 'blur(50px) brightness(0.5)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,20,0) 0%, #0a0a14 100%)' }} />
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
            {rating > 0 && <Pill><Star size={12} fill="#fbbf24" color="#fbbf24" /> {rating}/10</Pill>}
          </div>
        </div>

        {/* Big Poster Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', width: '100%', aspectRatio: '2/3', maxHeight: '70vh', borderRadius: 32, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          {poster ? (
            <Image src={poster} alt={movie.title || movie.name} fill sizes="(max-width: 640px) 100vw, 640px" priority style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1c1c2e' }} />
          )}
          
          {/* Watch Trailer Button Overlay */}
          {trailerUrl && (
            <button onClick={() => window.open(trailerUrl, '_blank')} style={{
              position: 'absolute', bottom: '1.25rem', right: '1.25rem',
              padding: '0.75rem 1.25rem', borderRadius: 99,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: '0.875rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Play size={16} fill="#fff" /> Watch Trailer
            </button>
          )}
        </motion.div>

        {/* Title and Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {movie.title || movie.name}
          </h1>
          {movie.overview && (
            <div>
              <p style={{
                margin: 0, color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6,
                display: expandedOverview ? 'block' : '-webkit-box',
                WebkitLineClamp: expandedOverview ? 'unset' : 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'all 0.3s'
              }}>
                {movie.overview}
              </p>
              <button onClick={() => setExpandedOverview(!expandedOverview)} style={{
                background: 'none', border: 'none', color: '#f8fafc', fontSize: '0.875rem', fontWeight: 700,
                padding: 0, marginTop: '0.5rem', cursor: 'pointer'
              }}>
                {expandedOverview ? 'Show Less' : 'Read More'}
              </button>
            </div>
          )}
        </motion.div>

        <WatchProviders providers={movie['watch/providers']} />

        {/* Cast */}
        {cast.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem' }}>Cast</h2>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
              {cast.map(person => (
                <div key={person.id} style={{ flexShrink: 0, width: 88, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: 88, height: 88, borderRadius: 20, overflow: 'hidden', background: '#1c1c2e', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
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
          </motion.div>
        )}

        {/* Friend Reviews */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Friend Reviews</h2>
            {posts?.length > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{posts.length}</span>
            )}
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '4rem' }}>
              {posts.map((post, i) => {
                const cat = getCategoryById(post.category)
                return (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '1.25rem' }}>
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
        </motion.div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
