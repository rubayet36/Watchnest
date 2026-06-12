'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Play, Trash2, Clock, Film, Tv, Sparkles, AlertCircle } from 'lucide-react'
import { getWatchHistory, removeFromWatchHistory, clearWatchHistory } from '@/lib/watch-history'
import { getPosterUrl } from '@/lib/tmdb'

function formatRelativeTime(dateString) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    if (diffMs < 0) return 'Just now'
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  } catch (e) {
    return 'Recently'
  }
}

export default function WatchHistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setHistory(getWatchHistory())
    setIsLoaded(true)
  }, [])

  const handleRemove = (id, mediaType) => {
    removeFromWatchHistory(id, mediaType)
    setHistory(getWatchHistory())
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      clearWatchHistory()
      setHistory([])
    }
  }

  const getResumeUrl = (item) => {
    if (item.media_type === 'anime') {
      const ep = item.progress?.epNum || '1'
      const epId = item.progress?.episodeId
      if (epId) {
        return `/anime/watch/${epId}?ep=${ep}&anilistId=${item.id}`
      }
      return `/anime/${item.id}`
    }
    return `/media/${item.media_type}/${item.id}`
  }

  const getBadgeColor = (type) => {
    switch (type) {
      case 'anime':
        return { bg: 'rgba(244, 117, 33, 0.15)', text: '#f47521', border: 'rgba(244, 117, 33, 0.3)' }
      case 'tv':
        return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' }
      default: // movie
        return { bg: 'rgba(34, 211, 238, 0.15)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.3)' }
    }
  }

  return (
    <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 800, margin: '0 auto', padding: '1.25rem', color: '#fff' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', justifyCenter: 'center', width: '38px', height: '38px',
              borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <ChevronLeft size={20} style={{ margin: '0 auto' }} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#f47521" /> Watch History
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Continue watching your recently viewed items
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem',
              borderRadius: '99px', border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.8rem',
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)' }}
          >
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {/* History Items List */}
      {!isLoaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#f47521', animation: 'wn-spin 0.85s linear infinite' }} />
        </div>
      ) : history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center', padding: '4rem 1.5rem', background: 'rgba(255,255,255,0.02)',
            borderRadius: 24, border: '1px dashed rgba(255,255,255,0.08)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: '1.25rem'
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244,117,33,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f47521' }}>
            <Clock size={32} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800 }}>No watch history yet</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', maxWidth: '320px', lineHeight: 1.5 }}>
              Your history is empty. Start streaming movies, TV shows, or anime to keep track of your progress!
            </p>
          </div>
          <Link
            href="/"
            style={{
              textDecoration: 'none', padding: '0.6rem 1.5rem', borderRadius: '99px',
              background: 'linear-gradient(135deg, #f47521, #ff9e59)', color: '#fff',
              fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 4px 16px rgba(244, 117, 33, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Discover Movies & Shows
          </Link>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <AnimatePresence mode="popLayout">
            {history.map((item) => {
              const badge = getBadgeColor(item.media_type)
              const poster = item.poster_path
                ? (item.media_type === 'anime' ? item.poster_path : getPosterUrl(item.poster_path, 'w185'))
                : null

              return (
                <motion.div
                  key={`${item.media_type}-${item.id}`}
                  layout
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
                    borderRadius: '20px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)', position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Poster Thumbnail */}
                  <div style={{ width: '60px', height: '84px', borderRadius: '12px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: '#1c1c2e' }}>
                    {poster ? (
                      <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: '99px', background: badge.bg,
                        color: badge.text, border: `1px solid ${badge.border}`, letterSpacing: '0.04em'
                      }}>
                        {item.media_type === 'tv' ? 'TV Show' : item.media_type}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {formatRelativeTime(item.last_watched_at)}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </h2>

                    {/* Progress details */}
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.media_type === 'tv' && item.progress?.season !== undefined && (
                        <>
                          <Tv size={11} color="#a78bfa" />
                          <span>Season {item.progress.season}, Episode {item.progress.episode}</span>
                        </>
                      )}
                      {item.media_type === 'anime' && item.progress?.epNum !== undefined && (
                        <>
                          <Tv size={11} color="#f47521" />
                          <span>Episode {item.progress.epNum}</span>
                        </>
                      )}
                      {item.media_type === 'movie' && (
                        <>
                          <Film size={11} color="#22d3ee" />
                          <span>Full Movie</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Play/Resume Link */}
                    <Link
                      href={getResumeUrl(item)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f47521, #ff9e59)', color: '#fff',
                        boxShadow: '0 4px 12px rgba(244, 117, 33, 0.25)', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(244, 117, 33, 0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 117, 33, 0.25)' }}
                      aria-label="Resume playing"
                    >
                      <Play size={14} fill="#fff" stroke="none" style={{ marginLeft: '2px' }} />
                    </Link>

                    {/* Remove from history */}
                    <button
                      onClick={() => handleRemove(item.id, item.media_type)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                        color: '#64748b', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                      aria-label="Remove from history"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        @keyframes wn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
