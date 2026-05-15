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
const fetchWatchlist = () => authFetch('/api/watchlist').then(r => r.json()).then(d => d.movies || [])
const fetchFollows   = () => authFetch('/api/follows').then(r => r.json())
const fetchPartnerFeed = (uid) => fetch(`/api/feed?user=${uid}&page=0`).then(r => r.json()).then(d => d.posts || [])

// ─── Shared Styles ─────────────────────────────────────────────
const card = {
  display: 'flex', alignItems: 'center', gap: '0.875rem',
  padding: '0.875rem', borderRadius: 16,
  background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(18px)',
}

const pill = (active, color = '#7c3aed') => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '0.35rem 0.875rem', borderRadius: 99,
  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
  border: 'none', fontFamily: 'inherit', transition: 'all .15s',
  background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
  color:      active ? color : '#64748b',
  outline:    active ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.08)',
})

// ═══════════════════════════════════════════════════════════════
// MY SAVES TAB
// ═══════════════════════════════════════════════════════════════
function MySavesTab() {
  const qc = useQueryClient()
  const { data: movies, isLoading } = useQuery({ queryKey: ['watchlist'], queryFn: fetchWatchlist, staleTime: 30_000 })

  const toggleWatched = useMutation({
    mutationFn: ({ save_id, watched }) =>
      authFetch('/api/saves/watched', { method: 'PATCH', body: JSON.stringify({ save_id, watched }) })
        .then(r => r.json()),
    onMutate: async ({ save_id, watched }) => {
      await qc.cancelQueries({ queryKey: ['watchlist'] })
      const previous = qc.getQueryData(['watchlist'])
      qc.setQueryData(['watchlist'], (old = []) =>
        old.map(movie => movie.save_id === save_id ? { ...movie, watched } : movie)
      )
      return { previous }
    },
    onError: (e, _vars, context) => {
      if (context?.previous) qc.setQueryData(['watchlist'], context.previous)
      toast.error(e.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const savedMovies = useMemo(() => movies || [], [movies])
  const toWatch = useMemo(() => savedMovies.filter(m => !m.watched), [savedMovies])
  const watched = useMemo(() => savedMovies.filter(m => m.watched), [savedMovies])
  const sharedCount = useMemo(() => savedMovies.filter(m => m.shared_by_user).length, [savedMovies])

  if (isLoading) return (
    <div className="watchlist-stack">
      <div className="watchlist-skeleton-grid">
        <CardSkeleton/><CardSkeleton/><CardSkeleton/>
      </div>
    </div>
  )
  if (!savedMovies.length) return (
    <div className="watchlist-empty glass">
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔖</div>
      <div className="watchlist-empty-icon"><Bookmark size={28}/></div>
      <h3>No saves yet</h3>
      <p>Save a movie or series from the feed and it will land here, ready when you are.</p>
      <Link href="/" style={{ display:'inline-block', marginTop:'1.25rem', padding:'0.625rem 1.25rem', background:'linear-gradient(135deg,#7c3aed,#db2777)', borderRadius:12, color:'white', fontWeight:600, textDecoration:'none', fontSize:'0.875rem' }}>Browse feed →</Link>
    </div>
  )

  const SaveCard = ({ m }) => {
    const cat = getCategoryById(m.category)
    const isAnime = m.genres?.includes('Animation') && m.media_type === 'tv'
    const mediaLabel = isAnime ? 'ANIME' : (m.media_type === 'tv' ? 'TV' : 'MOVIE')
    const mediaColor = isAnime ? '#ec4899' : (m.media_type === 'tv' ? '#3b82f6' : '#10b981')

    return (
      <motion.article
        className={`watchlist-save-card ${m.watched ? 'is-watched' : ''}`}
        initial={{ opacity:0, y:6 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.16 }}
      >
        <Link prefetch={false} href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} className="watchlist-poster-link">
          <div className="watchlist-poster">
            <PosterImage src={getPosterUrl(m.poster_path)} alt={m.title} fill sizes="58px" />
          </div>
        </Link>
        <div className="watchlist-save-main">
          <Link prefetch={false} href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} className="watchlist-title-link">
            <h3>
              {m.title}
              <span className="watchlist-media-badge" style={{ '--media-color': mediaColor }}>{mediaLabel}</span>
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
          aria-label={m.watched ? `Mark ${m.title} as not watched` : `Mark ${m.title} as watched`}
          disabled={toggleWatched.isPending}
          onClick={() => toggleWatched.mutate({ save_id: m.save_id, watched: !m.watched })}
          className={`watchlist-status-button ${m.watched ? 'is-done' : ''}`}
        >
          {m.watched ? <CheckCircle size={16}/> : <Circle size={16}/>}
          <span>{m.watched ? 'Done' : 'Watch'}</span>
        </button>
      </motion.article>
    )
  }

  return (
    <div className="watchlist-stack">
      <section className="watchlist-stats" aria-label="Watchlist stats">
        <div>
          <span>Queued</span>
          <strong>{toWatch.length}</strong>
        </div>
        <div>
          <span>Watched</span>
          <strong>{watched.length}</strong>
        </div>
        <div>
          <span>Shared</span>
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
          <div className="watchlist-save-list">{toWatch.map(m => <SaveCard key={m.save_id||m.id} m={m}/>)}</div>
        </section>
      )}
      {watched.length > 0 && (
        <section className="watchlist-section">
          <div className="watchlist-section-title is-complete">
            <CheckCircle size={14}/>
            <p>Already Watched</p>
            <span>{watched.length}</span>
          </div>
          <div className="watchlist-save-list">{watched.map(m => <SaveCard key={m.save_id||m.id} m={m}/>)}</div>
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
  const { data, isLoading } = useQuery({ queryKey: ['follows'], queryFn: fetchFollows, staleTime: 30_000 })

  const sendRequest = useMutation({
    mutationFn: (following_id) =>
      authFetch('/api/follows', { method:'POST', body: JSON.stringify({ following_id }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Partner request sent!'); qc.invalidateQueries({ queryKey:['follows'] }) },
    onError: e => toast.error(e.message),
  })

  const cancelRequest = useMutation({
    mutationFn: (following_id) =>
      authFetch('/api/follows', { method:'DELETE', body: JSON.stringify({ following_id }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Request cancelled'); qc.invalidateQueries({ queryKey:['follows'] }) },
    onError: e => toast.error(e.message),
  })

  const respondRequest = useMutation({
    mutationFn: ({ follow_id, status }) =>
      authFetch('/api/follows', { method:'PATCH', body: JSON.stringify({ follow_id, status }) }).then(r => r.json()),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'accepted' ? 'Partner accepted!' : 'Request declined')
      qc.invalidateQueries({ queryKey:['follows'] })
    },
    onError: e => toast.error(e.message),
  })

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><LoadingSpinner size="md"/></div>

  if (viewingPartner) {
    return <PartnerFeed partner={viewingPartner} onBack={() => setViewingPartner(null)} currentUserId={currentUserId} />
  }

  const users    = data?.users    || []
  const sent     = data?.sent     || []
  const received = data?.received || []

  // Build lookup maps
  const sentMap     = Object.fromEntries(sent.map(s => [s.following_id, s]))     // userId → {id, status}
  const receivedMap = Object.fromEntries(received.map(r => [r.follower_id, r]))  // userId → {id, status, profiles}

  const partners        = users.filter(u => sentMap[u.id]?.status === 'accepted' || receivedMap[u.id]?.status === 'accepted')
  const pendingSent     = users.filter(u => sentMap[u.id]?.status === 'pending')
  const pendingReceived = received.filter(r => r.status === 'pending')
  const others          = users.filter(u => !sentMap[u.id] && !receivedMap[u.id])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

      {/* ── Incoming Requests ─────────────────────────────── */}
      {pendingReceived.length > 0 && (
        <section>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem' }}>
            <Bell size={14} style={{ color:'#f59e0b' }}/>
            <p style={{ margin:0, fontSize:'0.75rem', fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Partner Requests ({pendingReceived.length})
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {pendingReceived.map(req => {
              const sender = req.profiles
              return (
                <motion.div key={req.id} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                  style={{ ...card, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.06)' }}>
                  <Avatar user={sender} size={42}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, color:'#e2e8f0' }}>{sender?.name || sender?.username}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#64748b' }}>
                      Wants to be your partner
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => respondRequest.mutate({ follow_id: req.id, status:'accepted' })}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'0.35rem 0.75rem', borderRadius:99, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'rgba(16,185,129,0.15)', color:'#6ee7b7', outline:'1px solid rgba(16,185,129,0.3)' }}>
                      <Check size={13}/> Accept
                    </button>
                    <button onClick={() => respondRequest.mutate({ follow_id: req.id, status:'declined' })}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'0.35rem 0.75rem', borderRadius:99, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'rgba(244,63,94,0.1)', color:'#f87171', outline:'1px solid rgba(244,63,94,0.2)' }}>
                      <X size={13}/> Decline
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Accepted Partners ─────────────────────────────── */}
      {partners.length > 0 && (
        <section>
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#8b5cf6', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Your Partners ({partners.length})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {partners.map(u => {
              const row = sentMap[u.id] || receivedMap[u.id]
              return (
                <motion.div key={u.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={card}>
                  <Avatar user={u} size={42}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, color:'#e2e8f0' }}>{u.name || u.username}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#64748b' }}>@{u.username}</p>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => setViewingPartner(u)}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'0.35rem 0.875rem', borderRadius:99, fontSize:'0.8rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'rgba(139,92,246,0.15)', color:'#c4b5fd' }}>
                      <Film size={13}/> View
                    </button>
                    <button onClick={() => cancelRequest.mutate(u.id)}
                      style={pill(true, '#10b981')}>
                      <UserCheck size={13}/> Partner
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Pending Sent ──────────────────────────────────── */}
      {pendingSent.length > 0 && (
        <section>
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Pending Requests ({pendingSent.length})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {pendingSent.map(u => (
              <motion.div key={u.id} initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ ...card, opacity:0.8 }}>
                <Avatar user={u} size={42}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:700, color:'#e2e8f0' }}>{u.name || u.username}</p>
                  <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#64748b' }}>Request pending…</p>
                </div>
                <button onClick={() => cancelRequest.mutate(u.id)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'0.35rem 0.875rem', borderRadius:99, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'rgba(255,255,255,0.05)', color:'#64748b', outline:'1px solid rgba(255,255,255,0.1)' }}>
                  <Clock size={12}/> Pending
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Discover Users ────────────────────────────────── */}
      <section>
        <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Discover ({others.length})
        </p>
        {others.length === 0 && (
          <div style={{ textAlign:'center', padding:'2rem', color:'#475569', fontSize:'0.875rem' }}>
            {users.length === 0 ? 'No other users on WatchNest yet.' : 'You\'ve connected with everyone!'}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
          {others.map(u => (
            <motion.div key={u.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={card}>
              <Avatar user={u} size={42}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontWeight:700, color:'#e2e8f0' }}>{u.name || u.username}</p>
                <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#64748b' }}>@{u.username}</p>
                {u.bio && <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.bio}</p>}
              </div>
              <button onClick={() => sendRequest.mutate(u.id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'0.4rem 0.9rem', borderRadius:99, fontSize:'0.8rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', flexShrink:0 }}>
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
          <p style={{ margin:0, fontWeight:700, color:'#e2e8f0', fontSize:'0.9375rem' }}>{partner.name}</p>
          <p style={{ margin:0, fontSize:'0.75rem', color:'#64748b' }}>@{partner.username} · {posts?.length || 0} movies</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}><CardSkeleton/><CardSkeleton/></div>
      ) : !posts?.length ? (
        <div style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🎬</div>
          <h3 style={{ color:'#e2e8f0', margin:'0 0 0.5rem' }}>{partner.name} has not added any movies yet</h3>
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
  const { data: followData } = useQuery({ queryKey: ['follows'], queryFn: fetchFollows, staleTime: 30_000 })
  const pendingCount = (followData?.received || []).filter(r => r.status === 'pending').length

  return (
    <div className="page-shell mobile-safe-bottom watchlist-page">
      <header className="watchlist-hero glass">
        <div className="watchlist-hero-icon">
          <Bookmark size={22}/>
        </div>
        <div className="watchlist-hero-copy">
          <p className="page-kicker">Library</p>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-subtitle">Your saved queue, finished picks, and partner activity in one fast view.</p>
        </div>
        <div className="watchlist-hero-signal" aria-hidden="true">
          <Sparkles size={16}/>
          <span>Ready</span>
        </div>
      </header>

      <div className="watchlist-tabs" role="tablist" aria-label="Watchlist sections">
        <WatchlistTab id="saves" label="My Saves" icon={<ListChecks size={16}/>} active={tab === 'saves'} onClick={setTab} />
        <WatchlistTab id="partners" label="Partners" icon={<Users size={16}/>} active={tab === 'partners'} pendingCount={pendingCount} onClick={setTab} />
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
