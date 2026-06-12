'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Play, Tv, Users, Heart, Info, Calendar, Sparkles, X, SkipForward, AlertTriangle, MonitorPlay } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { addToWatchHistory } from '@/lib/watch-history'

// Custom loader/ui
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function AnimeWatchPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  
  const episodeId = resolvedParams.episodeId
  const malId = searchParams.get('malId')
  const anilistId = searchParams.get('anilistId') || ''
  const epNum = searchParams.get('ep') || '1'

  const animeId = useMemo(() => {
    if (!episodeId) return ''
    return episodeId.split('~')[0]
  }, [episodeId])

  const { data: gogoInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['gogoInfoWatch', animeId],
    queryFn: async () => {
      const res = await fetch(`/api/gogoanime/info?id=${animeId}`)
      if (!res.ok) throw new Error('Failed to fetch anime details')
      return res.json()
    },
    enabled: !!animeId,
  })

  const sortedEpisodes = useMemo(() => {
    if (!gogoInfo?.episodes) return []
    return [...gogoInfo.episodes].sort((a, b) => b.episodeNumber - a.episodeNumber)
  }, [gogoInfo])

  const [activeServer, setActiveServer] = useState(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [adBlockActive, setAdBlockActive] = useState(false)

  // ── 1. Fetch Streaming Servers ──────────────────────────────────
  const { data: watchData, isLoading: watchLoading, error: watchError } = useQuery({
    queryKey: ['gogoWatch', episodeId, malId, epNum],
    queryFn: async () => {
      const res = await fetch(`/api/gogoanime/watch?episodeId=${episodeId}&malId=${malId || ''}&ep=${epNum}`)
      if (!res.ok) throw new Error('Failed to fetch stream servers')
      return res.json()
    },
    enabled: !!episodeId,
  })

  // ── 2. Fetch AniSkip Timestamps ─────────────────────────────────
  const { data: skipData } = useQuery({
    queryKey: ['aniSkip', malId, epNum],
    queryFn: async () => {
      const res = await fetch(`/api/aniskip?malId=${malId}&episode=${epNum}`)
      if (!res.ok) throw new Error('Failed to fetch skip timestamps')
      return res.json()
    },
    enabled: !!malId && !!epNum,
    staleTime: 3600_000, // 1 hour
  })

  // Select default server
  useEffect(() => {
    if (watchData?.servers?.length > 0) {
      // Check localStorage preference
      const savedServer = localStorage.getItem('last_anime_server')
      const matched = watchData.servers.find(s => s.name === savedServer)
      setActiveServer(matched || watchData.servers[0])
    }
  }, [watchData])

  // Save watch progress to history list
  useEffect(() => {
    if (anilistId && gogoInfo) {
      addToWatchHistory({
        id: anilistId,
        title: gogoInfo.title,
        poster_path: gogoInfo.image,
        media_type: 'anime',
        progress: { epNum, episodeId }
      })
    }
  }, [anilistId, gogoInfo, epNum, episodeId])

  // Save server preference
  const handleServerChange = (server) => {
    setIframeLoaded(false)
    setActiveServer(server)
    localStorage.setItem('last_anime_server', server.name)
  }

  // ── 3. Anti-ad redirect protection (silently blocks auto-redirects) ──────────────────
  useEffect(() => {
    let isIntentional = false

    const handleBeforeUnload = (e) => {
      if (!isIntentional) {
        e.preventDefault()
        setAdBlockActive(true)
        setTimeout(() => setAdBlockActive(false), 5000)
        e.returnValue = 'An advertisement tried to redirect the page.'
        return 'An advertisement tried to redirect the page.'
      }
    }

    const handleIntentionalClick = () => {
      isIntentional = true
      setTimeout(() => { isIntentional = false }, 1000)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleIntentionalClick, { capture: true })

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleIntentionalClick, { capture: true })
    }
  }, [])

  if (watchLoading) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 640, margin: '0 auto', padding: '1.25rem' }}>
        <div style={{ height: 280, borderRadius: 24, marginBottom: 24 }} className="shimmer" />
        <LoadingSpinner />
      </div>
    )
  }

  if (watchError || !watchData || !activeServer) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 640, margin: '4rem auto', textAlign: 'center', color: '#fff' }}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#e2e8f0' }}>Stream Unresolvable</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Failed to load streaming options for this episode.</p>
        <button onClick={() => router.back()} className="btn-primary" style={{ marginTop: '1.5rem' }}>Go Back</button>
      </div>
    )
  }

  // Parse AniSkip OP/ED times
  const opInfo = skipData?.results?.find(r => r.skipType === 'op')
  const edInfo = skipData?.results?.find(r => r.skipType === 'ed')

  const formatSkipTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#070914', overflowX: 'hidden', color: '#fff' }}>
      
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '1.25rem' }}>
        
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
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', padding: '3px 8px', background: 'rgba(244,117,33,0.15)', color: '#f47521', border: '1px solid rgba(244,117,33,0.3)', borderRadius: '6px', fontWeight: 900, textTransform: 'uppercase' }}>
              EPISODE {epNum}
            </span>
          </div>
        </div>

        {/* Responsive Grid Layout */}
        <div className="watch-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Player & Servers */}
          <div style={{ minWidth: 0 }}>
            {/* Video Player Shell */}
            <div className="stream-frame-shell" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 20, overflow: 'hidden', background: '#0d0d1a', boxShadow: '0 24px 60px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
              {!iframeLoaded && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#f47521', animation: 'spin 0.85s linear infinite' }} />
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Connecting Server...</p>
                </div>
              )}

              <iframe
                key={activeServer.url}
                src={activeServer.url}
                title={`${activeServer.name} player`}
                width="100%"
                height="100%"
                style={{ border: 'none', position: 'absolute', inset: 0 }}
                allowFullScreen
                allow="autoplay; fullscreen *; encrypted-media; picture-in-picture"
                referrerPolicy="origin"
                onLoad={() => setIframeLoaded(true)}
              />

              {/* Ad interceptor notice overlay */}
              <AnimatePresence>
                {adBlockActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(239, 68, 68, 0.9)', backdropFilter: 'blur(8px)',
                      color: '#fff', padding: '6px 12px', borderRadius: '99px', zIndex: 30,
                      fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    🛡️ Ad Redirect Intercepted & Blocked
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Server switcher row */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem 0' }}>
                Select Stream Server
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem', padding: '0.35rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: 'rgba(255,255,255,0.045)' }}>
                {watchData.servers.map((server, idx) => {
                  const isActive = server.url === activeServer.url
                  return (
                    <button
                      key={`${server.name}-${idx}`}
                      type="button"
                      onClick={() => handleServerChange(server)}
                      style={{
                        minWidth: 0, minHeight: '38px', borderRadius: '12px', cursor: 'pointer',
                        border: isActive ? '1px solid rgba(244,117,33,0.4)' : '1px solid transparent',
                        background: isActive ? 'rgba(244,117,33,0.16)' : 'transparent',
                        color: isActive ? '#fff' : '#94a3b8',
                        fontSize: '0.76rem', fontWeight: 800, transition: 'all 0.15s ease'
                      }}
                    >
                      {server.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AniSkip Info Display Card */}
            {skipData?.found && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                padding: '1.25rem', background: 'rgba(244,117,33,0.05)', borderRadius: 20,
                border: '1px solid rgba(244,117,33,0.15)', marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#f47521', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SkipForward size={14} fill="#f47521" stroke="none" /> Skip Intro Timestamps
                </h4>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {opInfo && (
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Opening (OP)</span>
                      <strong>{formatSkipTime(opInfo.interval.startTime)} — {formatSkipTime(opInfo.interval.endTime)}</strong>
                    </div>
                  )}
                  {edInfo && (
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Ending (ED)</span>
                      <strong>{formatSkipTime(edInfo.interval.startTime)} — {formatSkipTime(edInfo.interval.endTime)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Episode Guide List */}
          <div style={{ minWidth: 0 }} className="watch-episodes-column">
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem 0' }}>
              Episode Guide
            </h3>
            
            {infoLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <LoadingSpinner />
              </div>
            ) : sortedEpisodes.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No episodes list available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                {sortedEpisodes.map((ep) => {
                  const isActive = ep.episodeNumber === Number(epNum)
                  return (
                    <Link
                      key={ep.id}
                      href={`/anime/watch/${ep.id}?malId=${malId || ''}&ep=${ep.episodeNumber}&anilistId=${anilistId || ''}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          padding: '0.6rem',
                          borderRadius: '12px',
                          background: isActive ? 'rgba(244, 117, 33, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isActive ? '1px solid rgba(244, 117, 33, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(244, 117, 33, 0.08)'
                            e.currentTarget.style.borderColor = 'rgba(244, 117, 33, 0.4)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                          }
                        }}
                      >
                        {/* Episode Still (using a placeholder or generic icon) */}
                        <div style={{ width: '80px', height: '45px', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#1c1c2e' }}>
                          {gogoInfo?.image ? (
                            <Image src={gogoInfo.image} alt="" fill sizes="80px" style={{ objectFit: 'cover', opacity: isActive ? 0.9 : 0.7 }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#64748b' }}>🎬</div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive ? '#f47521' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Episode {ep.episodeNumber}
                            </span>
                            {isActive && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 900, color: '#f47521', textTransform: 'uppercase' }}>
                                Watching
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Stream episode {ep.episodeNumber} in sub or dub.
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      <style>{`
        @media (min-width: 768px) {
          .watch-grid {
            grid-template-columns: 1fr 300px !important;
          }
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
          background: rgba(244,117,33,0.3);
          border-radius: 99px;
        }
      `}</style>
    </div>
  )
}
