'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Play, CheckCircle, Circle, AlertCircle, ChevronDown, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useWatchStatus, useWatchlist } from '@/hooks/useReactions'
import { authFetch } from '@/lib/auth-fetch'
import { getPosterUrl } from '@/lib/tmdb'
import PosterImage from '@/components/ui/PosterImage'
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner'

const STATUS_CONFIG = {
  'watching': { label: 'Watching', icon: Play, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'watched': { label: 'Completed', icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  'left-out': { label: 'Left Out', icon: AlertCircle, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  'queued': { label: 'Queue', icon: Clock, color: '#94a3b8', bg: 'rgba(255,255,255,0.06)' },
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const { updateStatus, isUpdatingStatus } = useWatchStatus()
  const { toggleSave } = useWatchlist()
  const [activeTab, setActiveTab] = useState('all')

  const { data: movies, isLoading, error } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/watchlist')
      const json = await res.json()
      return json.movies || []
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  })

  if (authLoading || isLoading) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ height: 120, borderRadius: 20, marginBottom: 24 }} className="shimmer" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <CardSkeleton /><CardSkeleton />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 640, margin: '2rem auto', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem' }}>🔑</p>
        <h2 style={{ color: '#e2e8f0' }}>Sign in to view History</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Your watch history is synced to your profile.</p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1.25rem', textDecoration: 'none' }}>Go to Login</Link>
      </div>
    )
  }

  // Filter movies into groups
  const savedMovies = movies || []
  const watching = savedMovies.filter(m => m.watch_status === 'watching')
  const completed = savedMovies.filter(m => m.watch_status === 'watched')
  const leftOut = savedMovies.filter(m => m.watch_status === 'left-out')
  const queued = savedMovies.filter(m => !m.watch_status || m.watch_status === 'queued')

  const displayMovies = activeTab === 'all' ? savedMovies : savedMovies.filter(m => m.watch_status === activeTab || (activeTab === 'queued' && (!m.watch_status || m.watch_status === 'queued')))

  function HistoryRow({ movie, index }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const currentStatus = movie.watch_status || 'queued'
    const conf = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['queued']
    const IconComponent = conf.icon

    return (
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.875rem', borderRadius: 16,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative'
        }}
      >
        {/* Poster */}
        <Link href={`/media/${movie.media_type || 'movie'}/${movie.tmdb_id}`} style={{ flexShrink: 0 }}>
          <div style={{ width: 52, height: 76, borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#1c1c2e' }}>
            <PosterImage src={getPosterUrl(movie.poster_path)} alt={movie.title} fill sizes="52px" style={{ objectFit: 'cover' }} />
          </div>
        </Link>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/media/${movie.media_type || 'movie'}/${movie.tmdb_id}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {movie.title}
            </h3>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4, fontSize: '0.78rem', color: '#64748b' }}>
            <span>{movie.release_year}</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: 4, textTransform: 'uppercase' }}>
              {movie.media_type === 'tv' ? 'TV' : 'Movie'}
            </span>
          </div>
        </div>

        {/* Action Dropdown & Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          {/* Status Badge Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.375rem 0.75rem', borderRadius: 99,
                fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                border: 'none', fontFamily: 'inherit',
                background: conf.bg, color: conf.color,
                transition: 'all 0.15s ease'
              }}
            >
              <IconComponent size={13} />
              <span>{conf.label}</span>
              <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute', right: 0, top: '105%', zIndex: 100,
                      background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '4px', minWidth: 130,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    {Object.entries(STATUS_CONFIG).map(([statusKey, statusVal]) => {
                      const ActiveIcon = statusVal.icon
                      const isCurrent = currentStatus === statusKey
                      return (
                        <button
                          key={statusKey}
                          onClick={() => {
                            updateStatus({ save_id: movie.save_id, watch_status: statusKey })
                            setMenuOpen(false)
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', border: 'none', borderRadius: 8,
                            background: isCurrent ? 'rgba(255,255,255,0.06)' : 'transparent',
                            color: isCurrent ? '#fff' : '#94a3b8',
                            fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'inherit',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => !isCurrent && (e.currentTarget.style.color = '#fff')}
                          onMouseLeave={e => !isCurrent && (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <ActiveIcon size={12} style={{ color: statusVal.color }} />
                          <span>{statusVal.label}</span>
                        </button>
                      )
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Remove/Delete Button */}
          <button
            onClick={() => toggleSave(movie.id)}
            title="Remove from history"
            style={{
              padding: '0.4rem', borderRadius: 10, cursor: 'pointer',
              border: 'none', background: 'rgba(255,255,255,0.05)', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; e.currentTarget.style.color = '#fb7185' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </motion.article>
    )
  }

  return (
    <div className="page-shell mobile-safe-bottom" style={{ maxWidth: 720, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="page-header">
        <div>
          <p className="page-kicker">Library</p>
          <h1 className="page-title gradient-text">Watch History</h1>
          <p className="page-subtitle">Track your viewing statuses across what youfinished, left off, or are watching.</p>
        </div>
      </header>

      {/* Stats row */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem',
        padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem'
      }}>
        {[
          { label: 'Total List', val: savedMovies.length, emoji: '📑', col: '#e2e8f0' },
          { label: 'Watching', val: watching.length, emoji: '👀', col: '#3b82f6' },
          { label: 'Completed', val: completed.length, emoji: '✅', col: '#10b981' },
          { label: 'Left Out', val: leftOut.length, emoji: '⏸️', col: '#f43f5e' },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1.25rem', display: 'block', marginBottom: 2 }}>{item.emoji}</span>
            <strong style={{ fontSize: '1.125rem', fontWeight: 800, color: item.col }}>{item.val}</strong>
            <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', marginTop: 2, textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</span>
          </div>
        ))}
      </section>

      {/* Filter Tabs */}
      <div className="chip-row" style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'All Items' },
          { id: 'watching', label: '👀 Watching' },
          { id: 'watched', label: '✅ Completed' },
          { id: 'left-out', label: '⏸️ Left Out' },
          { id: 'queued', label: '⏰ Queue' },
        ].map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`chip ${active ? 'chip-active' : ''}`}
              style={{ padding: '0.4rem 0.95rem', fontSize: '0.8125rem' }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* History List */}
      {displayMovies.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 1rem', borderRadius: 20,
          background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)'
        }}>
          <p style={{ fontSize: '3rem', margin: 0 }}>📺</p>
          <h3 style={{ color: '#e2e8f0', marginTop: '1rem', fontWeight: 700 }}>No titles found</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: 280, margin: '0 auto' }}>
            {activeTab === 'all' 
              ? "Your history list is empty. Add movies from Search or Feed!" 
              : `You don't have any items marked as ${activeTab} yet.`}
          </p>
          <Link href="/search" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1.25rem', textDecoration: 'none', fontSize: '0.8125rem' }}>Search Movies</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayMovies.map((movie, i) => (
            <HistoryRow key={movie.save_id || movie.id} movie={movie} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
