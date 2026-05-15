'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, CheckCircle, Circle, UserPlus, UserCheck, Users, ChevronLeft, Film, Clock, X, Check, Bell } from 'lucide-react'
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: e => toast.error(e.message),
  })

  if (isLoading) return <div style={{ display:'flex', flexDirection:'column', gap:12 }}><CardSkeleton/><CardSkeleton/></div>
  if (!movies?.length) return (
    <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔖</div>
      <h3 style={{ color:'#e2e8f0', margin:'0 0 0.5rem', fontWeight:700 }}>No saves yet</h3>
      <p style={{ color:'#64748b', margin:0, fontSize:'0.875rem' }}>Tap the bookmark icon on any movie to save it here.</p>
      <Link href="/" style={{ display:'inline-block', marginTop:'1.25rem', padding:'0.625rem 1.25rem', background:'linear-gradient(135deg,#7c3aed,#db2777)', borderRadius:12, color:'white', fontWeight:600, textDecoration:'none', fontSize:'0.875rem' }}>Browse feed →</Link>
    </div>
  )

  const toWatch  = movies.filter(m => !m.watched)
  const watched  = movies.filter(m => m.watched)

  const SaveCard = ({ m }) => {
    const cat = getCategoryById(m.category)
    const isAnime = m.genres?.includes('Animation') && m.media_type === 'tv'
    const mediaLabel = isAnime ? 'ANIME' : (m.media_type === 'tv' ? 'TV' : 'MOVIE')
    const mediaColor = isAnime ? '#ec4899' : (m.media_type === 'tv' ? '#3b82f6' : '#10b981')

    return (
      <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
        style={{ ...card, opacity: m.watched ? 0.65 : 1 }}>
        <Link href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} style={{ flexShrink:0 }}>
          <div style={{ position:'relative', width:58, height:84, borderRadius:10, overflow:'hidden', background:'#1c1c2e' }}>
            <PosterImage src={getPosterUrl(m.poster_path)} alt={m.title} fill sizes="58px" />
          </div>
        </Link>
        <div style={{ flex:1, minWidth:0 }}>
          <Link href={`/media/${m.media_type || 'movie'}/${m.tmdb_id}`} style={{ textDecoration:'none' }}>
            <h3 style={{ margin:'0 0 3px', fontSize:'0.9375rem', fontWeight:800, color: m.watched?'#64748b':'#e2e8f0', textDecoration: m.watched?'line-through':'none' }}>
              {m.title}
              <span style={{ marginLeft:8, fontSize:'0.65rem', padding:'2px 5px', background:`${mediaColor}22`, color:mediaColor, border:`1px solid ${mediaColor}44`, borderRadius:4, textDecoration:'none', verticalAlign:'middle' }}>{mediaLabel}</span>
            </h3>
          </Link>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {m.release_year && <span style={{ fontSize:'0.75rem', color:'#475569' }}>{m.release_year}</span>}
            <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:99, background:'rgba(139,92,246,0.1)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)' }}>{cat?.label}</span>
            {m.shared_by_user && (
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:'0.7rem', padding:'2px 8px', borderRadius:99, background:'rgba(244,63,94,0.1)', color:'#f43f5e', border:'1px solid rgba(244,63,94,0.2)' }}>
                Shared by {m.shared_by_user.name}
              </span>
            )}
          </div>
          <button onClick={() => toggleWatched.mutate({ save_id: m.save_id, watched: !m.watched })}
            style={pill(m.watched, '#10b981')}>
            {m.watched ? <CheckCircle size={13}/> : <Circle size={13}/>}
            {m.watched ? 'Watched' : 'Mark as Watched'}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
      {toWatch.length > 0 && (
        <section>
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>To Watch ({toWatch.length})</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>{toWatch.map(m => <SaveCard key={m.save_id||m.id} m={m}/>)}</div>
        </section>
      )}
      {watched.length > 0 && (
        <section>
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.08em' }}>Already Watched ({watched.length})</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>{watched.map(m => <SaveCard key={m.save_id||m.id} m={m}/>)}</div>
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
    <button onClick={() => onClick(id)} style={{
      padding:'0.625rem 1.25rem', borderRadius:'10px 10px 0 0',
      fontSize:'0.875rem', fontWeight:700, cursor:'pointer', border:'none',
      fontFamily:'inherit', position:'relative', transition:'all .15s',
      background: active ? 'rgba(34,211,238,0.14)' : 'transparent',
      color: active ? '#67e8f9' : '#94a3b8',
      borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent',
      marginBottom:-1,
    }}>
      {icon} {label}
      {id === 'partners' && pendingCount > 0 && (
        <span style={{ position:'absolute', top:6, right:6, width:16, height:16, borderRadius:'50%', background:'#f59e0b', color:'#000', fontSize:'0.625rem', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>
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
    <div className="page-shell mobile-safe-bottom">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem' }}>
        <div className="glass" style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bookmark size={20} style={{ color:'#f59e0b' }}/>
        </div>
        <div>
          <p className="page-kicker">Library</p>
          <h1 className="page-title gradient-text" style={{ fontSize:'clamp(1.55rem, 5vw, 2.1rem)' }}>Watchlist</h1>
          <p className="page-subtitle" style={{ marginTop:2 }}>Your saves and movie partners</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:'1.5rem' }}>
        <WatchlistTab id="saves" label="My Saves" icon={<Bookmark size={13} style={{ display:'inline', marginRight:4 }}/>} active={tab === 'saves'} onClick={setTab} />
        <WatchlistTab id="partners" label="Partner Watchlist" icon={<Users size={13} style={{ display:'inline', marginRight:4 }}/>} active={tab === 'partners'} pendingCount={pendingCount} onClick={setTab} />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}>
          {tab === 'saves'
            ? <MySavesTab />
            : <PartnersTab currentUserId={user?.id} />
          }
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
