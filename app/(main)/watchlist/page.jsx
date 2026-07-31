'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, CheckCircle, Circle, UserPlus, UserCheck, Users, ChevronLeft, Film, Clock, X, Check, Bell, Play, Sparkles, ListChecks } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import MovieCard from '@/components/feed/MovieCard'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import PosterImage from '@/components/ui/PosterImage'
import { getCategoryById } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Data Fetchers ──────────────────────────────────────────────
async function readJson(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || fallbackMessage)
  return data
}

const fetchWatchlist = async () => {
  const data = await readJson(await authFetch('/api/watchlist'), 'Failed to load watchlist')
  return data.movies || []
}

const fetchFollows = async () => readJson(await authFetch('/api/follows'), 'Failed to load partners')

const fetchPartnerFeed = async (uid) => {
  const data = await readJson(await fetch(`/api/feed?user=${uid}&page=0`), 'Failed to load partner feed')
  return data.posts || []
}

// ─── Shared Card Style ──────────────────────────────────────────
const cardStyle = {
  display: 'flex', alignItems: 'center', gap: '0.875rem',
  padding: '0.875rem', borderRadius: 16,
  background: '#15171C', border: '1px solid rgba(255,255,255,0.08)',
}

// ─── Top-Level Save Card Component ─────────────────────────────
function SaveCard({ m, onToggleWatched, isPending }) {
  const cat = getCategoryById(m.category)
  const isAnime = m.genres?.includes('Animation') && m.media_type === 'tv'
  const mediaLabel = isAnime ? 'ANIME' : (m.media_type === 'tv' ? 'TV' : 'MOVIE')
  const mediaColor = isAnime ? '#E8B23D' : (m.media_type === 'tv' ? '#3FDDA8' : '#FF6A3D')

  return (
    <motion.article
      layout="position"
      className={`watchlist-save-card ${m.watched ? 'is-watched' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <Link prefetch={false} href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} className="watchlist-poster-link">
        <div className="watchlist-poster">
          <PosterImage src={getPosterUrl(m.poster_path)} alt={m.title} fill sizes="60px" />
        </div>
      </Link>
      <div className="watchlist-save-main">
        <Link prefetch={false} href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} className="watchlist-title-link">
          <h3>
            {m.title}
            <span className="watchlist-media-badge" style={{ borderColor: `${mediaColor}44`, background: `${mediaColor}18`, color: mediaColor }}>
              {mediaLabel}
            </span>
          </h3>
        </Link>
        <div className="watchlist-meta-row">
          {m.release_year && <span>{m.release_year}</span>}
          {cat?.label && <span>{cat.label}</span>}
          {m.shared_by_user && (
            <span className="watchlist-shared-pill">
              Shared by {m.shared_by_user.name}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={m.watched ? `Mark ${m.title} as not watched` : `Mark ${m.title} as watched`}
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault()
          onToggleWatched({ save_id: m.save_id, watched: !m.watched })
        }}
        className={`watchlist-status-button ${m.watched ? 'is-done' : ''}`}
      >
        {m.watched ? <CheckCircle size={15}/> : <Circle size={15}/>}
        <span>{m.watched ? 'Done' : 'Watch'}</span>
      </button>
    </motion.article>
  )
}

// ═══════════════════════════════════════════════════════════════
// MY SAVES TAB
// ═══════════════════════════════════════════════════════════════
function MySavesTab() {
  const qc = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  const watchlistKey = ['watchlist', user?.id]
  const { data: movies, isLoading, isError, error } = useQuery({
    queryKey: watchlistKey,
    queryFn: fetchWatchlist,
    enabled: Boolean(user),
    staleTime: 30_000,
  })

  const toggleWatched = useMutation({
    mutationFn: ({ save_id, watched }) =>
      authFetch('/api/saves/watched', { method: 'PATCH', body: JSON.stringify({ save_id, watched }) })
        .then(r => r.json()),
    onMutate: async ({ save_id, watched }) => {
      await qc.cancelQueries({ queryKey: watchlistKey })
      const previous = qc.getQueryData(watchlistKey)
      qc.setQueryData(watchlistKey, (old = []) =>
        old.map(movie => movie.save_id === save_id ? { ...movie, watched } : movie)
      )
      return { previous }
    },
    onError: (e, _vars, context) => {
      if (context?.previous) qc.setQueryData(watchlistKey, context.previous)
      toast.error(e.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: watchlistKey }),
  })

  const savedMovies = useMemo(() => (movies || []).filter(m => m.media_type !== 'anime'), [movies])
  const toWatch = useMemo(() => savedMovies.filter(m => !m.watched), [savedMovies])
  const watched = useMemo(() => savedMovies.filter(m => m.watched), [savedMovies])
  const sharedCount = useMemo(() => savedMovies.filter(m => m.shared_by_user).length, [savedMovies])

  if (authLoading || isLoading) return (
    <div className="watchlist-stack">
      <div className="watchlist-skeleton-grid">
        <CardSkeleton/><CardSkeleton/><CardSkeleton/>
      </div>
    </div>
  )

  if (!user) return (
    <div className="watchlist-empty">
      <div className="watchlist-empty-icon" style={{ width: 60, height: 60, borderRadius: 16, marginBottom: 8 }}>
        <Bookmark size={28}/>
      </div>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', letterSpacing: '0.05em', color: '#F2EFE9', margin: '0 0 4px' }}>
        SIGN IN REQUIRED
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#9A9CA3', maxWidth: '22rem', margin: '0 0 1.25rem' }}>
        Sign in to view your saved queue, track watched titles, and sync across devices.
      </p>
      <Link href="/login" className="btn-primary" style={{ padding: '0.6rem 1.4rem', textDecoration: 'none' }}>
        Go to Login
      </Link>
    </div>
  )

  if (isError) return (
    <div className="watchlist-empty">
      <div className="watchlist-empty-icon" style={{ width: 60, height: 60, borderRadius: 16, marginBottom: 8 }}>
        <Bookmark size={28}/>
      </div>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', letterSpacing: '0.05em', color: '#F2EFE9', margin: '0 0 4px' }}>
        COULD NOT LOAD WATCHLIST
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#9A9CA3' }}>{error?.message || 'Please refresh and try again.'}</p>
    </div>
  )

  if (!savedMovies.length) return (
    <div className="watchlist-empty">
      <div className="watchlist-empty-icon" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 10 }}>
        <Bookmark size={30}/>
      </div>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.85rem', letterSpacing: '0.05em', color: '#F2EFE9', margin: '0 0 4px' }}>
        NOTHING SAVED YET
      </h3>
      <p style={{ fontSize: '0.88rem', color: '#9A9CA3', maxWidth: '24rem', margin: '0 0 1.25rem' }}>
        Bookmark a title from any detail page and it will be waiting for you here.
      </p>
      <Link href="/" className="btn-primary" style={{ padding: '0.65rem 1.5rem', textDecoration: 'none' }}>
        Browse Feed →
      </Link>
    </div>
  )

  return (
    <div className="watchlist-stack">
      <section className="watchlist-stats" aria-label="Watchlist stats">
        <div>
          <span>QUEUED</span>
          <strong>{toWatch.length}</strong>
        </div>
        <div>
          <span>WATCHED</span>
          <strong>{watched.length}</strong>
        </div>
        <div>
          <span>SHARED</span>
          <strong>{sharedCount}</strong>
        </div>
      </section>
      {toWatch.length > 0 && (
        <section className="watchlist-section">
          <div className="watchlist-section-title">
            <Play size={14}/>
            <p>Up Next</p>
            <span>{toWatch.length}</span>
          </div>
          <div className="watchlist-save-list">
            {toWatch.map(m => (
              <SaveCard key={m.save_id||m.id} m={m} onToggleWatched={toggleWatched.mutate} isPending={toggleWatched.isPending} />
            ))}
          </div>
        </section>
      )}
      {watched.length > 0 && (
        <section className="watchlist-section">
          <div className="watchlist-section-title is-complete">
            <CheckCircle size={14}/>
            <p>Already Watched</p>
            <span>{watched.length}</span>
          </div>
          <div className="watchlist-save-list">
            {watched.map(m => (
              <SaveCard key={m.save_id||m.id} m={m} onToggleWatched={toggleWatched.mutate} isPending={toggleWatched.isPending} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PARTNERS TAB
// ═══════════════════════════════════════════════════════════════
function PartnersTab({ currentUserId }) {
  const qc = useQueryClient()
  const [viewingPartner, setViewingPartner] = useState(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['follows', currentUserId],
    queryFn: fetchFollows,
    enabled: Boolean(currentUserId),
    staleTime: 30_000,
  })

  const sendRequest = useMutation({
    mutationFn: (targetId) =>
      authFetch('/api/follows', { method: 'POST', body: JSON.stringify({ target_id: targetId }) })
        .then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', currentUserId] })
      toast.success('Partner request sent!')
    },
    onError: (e) => toast.error(e.message),
  })

  const respondRequest = useMutation({
    mutationFn: ({ followId, action }) =>
      authFetch('/api/follows', { method: 'PATCH', body: JSON.stringify({ follow_id: followId, action }) })
        .then(r => r.json()),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['follows', currentUserId] })
      toast.success(action === 'accept' ? 'Partner accepted!' : 'Request declined')
    },
    onError: (e) => toast.error(e.message),
  })

  const cancelRequest = useMutation({
    mutationFn: (targetId) =>
      authFetch('/api/follows', { method: 'DELETE', body: JSON.stringify({ target_id: targetId }) })
        .then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', currentUserId] })
      toast.success('Request cancelled')
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="watchlist-stack">
      <CardSkeleton/><CardSkeleton/>
    </div>
  )

  if (isError) return (
    <div style={{ textAlign:'center', padding:'2rem', color:'#ef4444', fontSize:'0.875rem' }}>
      {error?.message || 'Failed to load partners'}
    </div>
  )

  if (viewingPartner) {
    return <PartnerFeed partner={viewingPartner} onBack={() => setViewingPartner(null)} currentUserId={currentUserId} />
  }

  const partners  = data?.partners  || []
  const received  = data?.received  || []
  const sent      = data?.sent      || []
  const users     = data?.users     || []

  const connectedIds = new Set([
    currentUserId,
    ...partners.map(p => p?.id).filter(Boolean),
    ...received.map(r => r?.sender?.id).filter(Boolean),
    ...sent.map(s => s?.receiver?.id).filter(Boolean),
  ])
  const others = users.filter(u => u?.id && !connectedIds.has(u.id))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      
      {/* ── Pending Received Requests ──────────────────────── */}
      {received.length > 0 && (
        <section>
          <div style={{ display:'flex', alignItems:'center', gap:6, margin:'0 0 0.75rem' }}>
            <Bell size={14} style={{ color: '#FF6A3D' }} />
            <p style={{ margin:0, fontFamily:"'JetBrains Mono', monospace", fontSize:'0.75rem', fontWeight:800, color:'#FF6A3D', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Pending Requests ({received.length})
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {received.filter(r => r?.sender).map(r => {
              const sender = r.sender
              return (
                <motion.div key={r.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={cardStyle}>
                  <Avatar user={sender} size={42}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, color:'#F2EFE9' }}>{sender.name || sender.username || 'User'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#9A9CA3' }}>Wants to share movie picks with you</p>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => respondRequest.mutate({ followId: r.id, action: 'accept' })}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'0.4rem 0.85rem', borderRadius:10, fontSize:'0.78rem', fontWeight:800, cursor:'pointer', border:'none', fontFamily:"'JetBrains Mono', monospace", background:'linear-gradient(135deg, #FF7D4D, #FF6A3D)', color:'#1a0a04' }}>
                      <Check size={13}/> Accept
                    </button>
                    <button onClick={() => respondRequest.mutate({ followId: r.id, action: 'decline' })}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'0.4rem 0.75rem', borderRadius:10, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:"'JetBrains Mono', monospace", background:'rgba(255,255,255,0.06)', color:'#9A9CA3' }}>
                      <X size={13}/> Decline
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Active Movie Partners ──────────────────────────── */}
      <section>
        <p style={{ margin:'0 0 0.75rem', fontFamily:"'JetBrains Mono', monospace", fontSize:'0.75rem', fontWeight:800, color:'#9A9CA3', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Movie Partners ({partners.length})
        </p>
        {partners.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', background:'#15171C', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}>
            <Users size={32} style={{ color: '#FF6A3D', marginBottom: 8 }} />
            <p style={{ margin:0, color:'#F2EFE9', fontWeight:700 }}>No partners connected yet</p>
            <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'#64748b' }}>Connect with a partner below to share watchlists & see what they are watching.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {partners.filter(p => p?.id).map(p => (
              <motion.div key={p.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={cardStyle}>
                <Avatar user={p} size={42}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:700, color:'#F2EFE9' }}>{p.name || p.username || 'User'}</p>
                  <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#9A9CA3' }}>@{p.username || 'user'}</p>
                </div>
                <button onClick={() => setViewingPartner(p)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'0.4rem 0.9rem', borderRadius:10, fontSize:'0.78rem', fontWeight:800, cursor:'pointer', border:'none', fontFamily:"'JetBrains Mono', monospace", background:'rgba(255,106,61,0.15)', color:'#FF6A3D', outline:'1px solid rgba(255,106,61,0.4)' }}>
                  <Film size={13}/> View Queue
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Sent Requests ──────────────────────────────────── */}
      {sent.length > 0 && (
        <section>
          <p style={{ margin:'0 0 0.75rem', fontFamily:"'JetBrains Mono', monospace", fontSize:'0.75rem', fontWeight:800, color:'#9A9CA3', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Sent Requests ({sent.length})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {sent.filter(s => s?.receiver).map(s => {
              const u = s.receiver
              return (
                <motion.div key={s.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={cardStyle}>
                  <Avatar user={u} size={42}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, color:'#F2EFE9' }}>{u.name || u.username || 'User'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#9A9CA3' }}>Request pending…</p>
                  </div>
                  <button onClick={() => cancelRequest.mutate(u.id)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'0.35rem 0.875rem', borderRadius:99, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:"'Manrope', sans-serif", background:'rgba(255,255,255,0.05)', color:'#9A9CA3', outline:'1px solid rgba(255,255,255,0.1)' }}>
                    <Clock size={12}/> Pending
                  </button>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Discover Users ────────────────────────────────── */}
      <section>
        <p style={{ margin:'0 0 0.75rem', fontFamily:"'JetBrains Mono', monospace", fontSize:'0.75rem', fontWeight:800, color:'#9A9CA3', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Discover ({others.length})
        </p>
        {others.length === 0 && (
          <div style={{ textAlign:'center', padding:'2rem', color:'#9A9CA3', fontSize:'0.875rem' }}>
            {users.length === 0 ? 'No other users on WatchNest yet.' : "You've connected with everyone!"}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
          {others.map(u => (
            <motion.div key={u.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={cardStyle}>
              <Avatar user={u} size={42}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontWeight:700, color:'#F2EFE9' }}>{u.name || u.username || 'User'}</p>
                <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#9A9CA3' }}>@{u.username || 'user'}</p>
                {u.bio && <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.bio}</p>}
              </div>
              <button onClick={() => sendRequest.mutate(u.id)}
                className="btn-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.78rem', width: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <UserPlus size={14}/> Add Partner
              </button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PARTNER FEED VIEW
// ═══════════════════════════════════════════════════════════════
function PartnerFeed({ partner, onBack, currentUserId }) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['partnerFeed', partner.id],
    queryFn: () => fetchPartnerFeed(partner.id),
    staleTime: 30_000,
  })

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.375rem 0.75rem', cursor:'pointer', color:'#94a3b8', fontFamily:'inherit', fontSize:'0.8125rem' }}>
          <ChevronLeft size={16}/> Back
        </button>
        <Avatar user={partner} size={36}/>
        <div>
          <p style={{ margin:0, fontWeight:700, color:'#F2EFE9', fontSize:'0.9375rem' }}>{partner.name}</p>
          <p style={{ margin:0, fontSize:'0.75rem', color:'#9A9CA3' }}>@{partner.username} · {posts?.length || 0} movies</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}><CardSkeleton/><CardSkeleton/></div>
      ) : !posts?.length ? (
        <div style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🎬</div>
          <h3 style={{ color:'#F2EFE9', margin:'0 0 0.5rem', fontFamily:"'Bebas Neue', sans-serif", fontSize:'1.5rem' }}>{partner.name} HAS NOT ADDED ANY MOVIES YET</h3>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {posts.map(post => <MovieCard key={post.id} post={{ ...post, profiles: partner }} currentUserId={currentUserId}/>)}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
function WatchlistTab({ id, label, icon, active, pendingCount = 0, onClick }) {
  return (
    <button onClick={() => onClick(id)} className={`watchlist-tab ${active ? 'is-active' : ''}`}>
      {icon}
      <span>{label}</span>
      {id === 'partners' && pendingCount > 0 && (
        <span className="watchlist-tab-count">
          {pendingCount}
        </span>
      )}
    </button>
  )
}

export default function WatchlistPage() {
  const { user } = useAuth()
  const [tab, setTab]  = useState('saves')

  // Badge: count pending received requests
  const { data: followData } = useQuery({
    queryKey: ['follows', user?.id],
    queryFn: fetchFollows,
    enabled: Boolean(user),
    staleTime: 30_000,
  })
  const pendingCount = (followData?.received || []).filter(r => r.status === 'pending').length

  return (
    <div className="page-shell mobile-safe-bottom watchlist-page" style={{ maxWidth: 840, margin: '0 auto', padding: '1rem 1.25rem' }}>
      <header className="watchlist-hero">
        <div className="watchlist-hero-icon">
          <Bookmark size={24}/>
        </div>
        <div className="watchlist-hero-copy">
          <h1 className="page-title">MY WATCHLIST</h1>
        </div>
        <div className="watchlist-hero-signal">
          <Sparkles size={14}/>
          <span>READY</span>
        </div>
      </header>

      <div className="watchlist-tabs" role="tablist" aria-label="Watchlist sections">
        <WatchlistTab id="saves" label="MY SAVES" icon={<ListChecks size={16}/>} active={tab === 'saves'} onClick={setTab} />
        <WatchlistTab id="partners" label="PARTNERS" icon={<Users size={16}/>} active={tab === 'partners'} pendingCount={pendingCount} onClick={setTab} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.14 }}>
          {tab === 'saves'
            ? <MySavesTab />
            : <PartnersTab currentUserId={user?.id} />
          }
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
