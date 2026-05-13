'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMovieDetails, getPosterUrl, getBackdropUrl } from '@/lib/tmdb'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Clock, Globe, ChevronLeft } from 'lucide-react'
import { LoadingSpinner, EmptyState, CardSkeleton } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { getCategoryById, timeAgo, REACTIONS } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'

async function fetchMoviePosts(tmdbId) {
  const res = await fetch(`/api/feed?tmdb=${tmdbId}&page=0`)
  const json = await res.json()
  return json.posts || []
}

export default function MediaDetailPage({ params }) {
  const { tmdbId, mediaType } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ['media', mediaType, tmdbId],
    queryFn: () => getMovieDetails(parseInt(tmdbId), mediaType),
    staleTime: 3600_000,
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['mediaPosts', mediaType, tmdbId],
    queryFn: () => fetchMoviePosts(tmdbId),
    staleTime: 30_000,
  })

  if (movieLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <LoadingSpinner size="lg" />
    </div>
  )
  if (!movie) return <EmptyState icon="🎬" title="Movie not found" message="" />

  const backdrop = getBackdropUrl(movie.backdrop_path)
  const poster   = getPosterUrl(movie.poster_path, 'w342')
  const runtime  = movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : null
  const cast     = movie.credits?.cast?.slice(0, 6) || []

  const isAnime = movie.genres?.some(g => g.id === 16 || g.name === 'Animation') && mediaType === 'tv'

  const allReactions  = posts?.flatMap(p => p.reactions || []) || []
  const reactionCounts = allReactions.reduce((acc, r) => ({ ...acc, [r.reaction_type]: (acc[r.reaction_type]||0)+1 }), {})

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* ── Backdrop ─────────────────────────────────────── */}
      <div style={{ position:'relative', height: 240, overflow:'hidden' }}>
        {backdrop ? (
          <Image src={backdrop} alt={movie.title || movie.name || 'Backdrop'} fill sizes="100vw" priority style={{ objectFit:'cover' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#3b0764,#0f172a)' }} />
        )}
        {/* gradient fade into page */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 30%, #0d0d1a 100%)' }} />

        {/* Back button */}
        <button onClick={() => router.back()} style={{
          position:'absolute', top:16, left:16,
          width:36, height:36, borderRadius:12,
          background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)',
          border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer',
          color:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div style={{ padding:'0 1rem 3rem', marginTop:-72, position:'relative', zIndex:1 }}>

        {/* Poster + Title row */}
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem' }}>
          {/* Poster */}
          <div style={{ position:'relative', width:100, height:148, borderRadius:16, overflow:'hidden', flexShrink:0, border:'2px solid rgba(255,255,255,0.12)', boxShadow:'0 20px 40px rgba(0,0,0,0.5)' }}>
            <Image src={poster} alt={movie.title || movie.name || 'Poster'} fill sizes="100px" style={{ objectFit:'cover' }} />
          </div>

          {/* Meta */}
          <div style={{ flex:1, paddingTop:80 }}>
            <h1 style={{ margin:'0 0 6px', fontSize:'1.25rem', fontWeight:900, color:'#f1f5f9', lineHeight:1.2 }}>{movie.title || movie.name}</h1>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.625rem', alignItems:'center', marginBottom:8 }}>
              {movie.vote_average > 0 && (
                <span style={{ display:'flex', alignItems:'center', gap:3, color:'#fbbf24', fontWeight:700, fontSize:'0.875rem' }}>
                  <Star size={13} fill="#fbbf24" /> {movie.vote_average?.toFixed(1)}
                </span>
              )}
              {movie.release_date && <span style={{ color:'#64748b', fontSize:'0.8125rem' }}>{movie.release_date.split('-')[0]}</span>}
              {runtime && <span style={{ display:'flex', alignItems:'center', gap:3, color:'#64748b', fontSize:'0.8125rem' }}><Clock size={12}/>{runtime}</span>}
              {movie.original_language && <span style={{ display:'flex', alignItems:'center', gap:3, color:'#64748b', fontSize:'0.8125rem', textTransform:'uppercase' }}><Globe size={12}/>{movie.original_language}</span>}
              
              {/* Media Type Badge */}
              {mediaType === 'tv' && (
                <span style={{ 
                  fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 800,
                  background: isAnime ? '#ec489922' : '#3b82f622', 
                  color: isAnime ? '#ec4899' : '#3b82f6', 
                  border: `1px solid ${isAnime ? '#ec489955' : '#3b82f655'}` 
                }}>
                  {isAnime ? 'ANIME' : 'TV SERIES'}
                </span>
              )}
              {mediaType === 'movie' && (
                <span style={{ 
                  fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 800,
                  background: '#10b98122', color: '#10b981', border: '1px solid #10b98155' 
                }}>
                  MOVIE
                </span>
              )}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {movie.genres?.slice(0,4).map(g => <Badge key={g.id} variant="genre">{g.name}</Badge>)}
            </div>
          </div>
        </div>

        {/* Overview */}
        {movie.overview && (
          <div style={{ background:'rgba(28,28,46,0.6)', border:'1px solid rgba(139,92,246,0.1)', borderRadius:18, padding:'1rem', marginBottom:'1rem' }}>
            <p style={{ margin:'0 0 0.5rem', fontSize:'0.7rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>Overview</p>
            <p style={{ margin:0, color:'#94a3b8', fontSize:'0.875rem', lineHeight:1.65 }}>{movie.overview}</p>
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div style={{ marginBottom:'1rem' }}>
            <p style={{ margin:'0 0 0.75rem', fontSize:'0.7rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>Cast</p>
            <div style={{ display:'flex', gap:'0.875rem', overflowX:'auto', paddingBottom:4 }}>
              {cast.map(person => (
                <div key={person.id} style={{ flexShrink:0, textAlign:'center', width:64 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'rgba(28,28,46,0.8)', margin:'0 auto 6px', border:'1px solid rgba(255,255,255,0.08)' }}>
                    {person.profile_path ? (
                      <Image src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} width={64} height={64} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
                    ) : (
                      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'1.25rem' }}>👤</div>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:'0.6875rem', color:'#94a3b8', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{person.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friend Reviews */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.875rem' }}>
            <p style={{ margin:0, fontSize:'0.7rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>Friend Reviews</p>
            {posts?.length > 0 && (
              <span style={{ padding:'2px 8px', borderRadius:99, background:'rgba(139,92,246,0.15)', color:'#a78bfa', fontSize:'0.7rem', fontWeight:700 }}>{posts.length}</span>
            )}
          </div>

          {/* Reaction summary */}
          {Object.keys(reactionCounts).length > 0 && (
            <div style={{ background:'rgba(28,28,46,0.6)', border:'1px solid rgba(139,92,246,0.1)', borderRadius:14, padding:'0.75rem 1rem', display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'0.875rem' }}>
              {REACTIONS.filter(r => reactionCounts[r.key]).map(r => (
                <div key={r.key} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:'1.125rem' }}>{r.emoji}</span>
                  <span style={{ fontSize:'0.875rem', fontWeight:700, color:'#94a3b8' }}>{reactionCounts[r.key]}</span>
                </div>
              ))}
            </div>
          )}

          {postsLoading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}><CardSkeleton/></div>
          ) : !posts || posts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>💬</div>
              <h3 style={{ color:'#e2e8f0', margin:'0 0 0.5rem', fontWeight:600 }}>No reviews yet</h3>
              <p style={{ color:'#64748b', margin:0, fontSize:'0.875rem' }}>Be the first in your nest to review this movie!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {posts.map((post, i) => {
                const cat = getCategoryById(post.category)
                return (
                  <motion.div key={post.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
                    style={{ background:'rgba(28,28,46,0.6)', border:'1px solid rgba(139,92,246,0.1)', borderRadius:18, padding:'1rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                      <Link href={`/profile/${post.profiles?.id}`}><Avatar user={post.profiles} size={36}/></Link>
                      <div style={{ flex:1 }}>
                        <Link href={`/profile/${post.profiles?.id}`} style={{ textDecoration:'none', fontWeight:600, color:'#e2e8f0', fontSize:'0.875rem' }}>
                          {post.profiles?.name}
                        </Link>
                        <p style={{ margin:0, fontSize:'0.75rem', color:'#475569' }}>{timeAgo(post.created_at)}</p>
                      </div>
                      {cat && (
                        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)' }}>
                          {cat.label}
                        </span>
                      )}
                    </div>
                    {post.personal_note && (
                      <p style={{ margin:0, fontSize:'0.875rem', color:'#94a3b8', fontStyle:'italic', lineHeight:1.6 }}>
                        "{post.personal_note}"
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
