'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, BookmarkCheck, Star, MessageCircle, ChevronDown } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import PosterImage from '@/components/ui/PosterImage'
import { getCategoryById, timeAgo, REACTIONS } from '@/lib/utils'
import { useReactions, useWatchlist } from '@/hooks/useReactions'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'

// ─── Category badge color map (inline-safe) ──────────────────
const CAT_COLORS = {
  'all-time-fav':  '#d97706',
  'made-me-cry':   '#3b82f6',
  'best-comedy':   '#22c55e',
  'mind-blowing':  '#8b5cf6',
  'watch-family':  '#f97316',
  'best-thriller': '#64748b',
  'best-horror':   '#dc2626',
  'must-watch':    '#ef4444',
  'hidden-gem':    '#06b6d4',
  'best-scifi':    '#0ea5e9',
  'date-movie':    '#ec4899',
  'underrated':    '#84cc16',
  'rewatchable':   '#a855f7',
}

function ReactionBar({ post }) {
  const { user } = useAuth()
  const { toggleReaction } = useReactions(post.id)
  const [showPicker, setShowPicker] = useState(false)

  const reactionCounts = {}
  const userReaction = post.reactions?.find(r => r.user_id === user?.id)?.reaction_type
  for (const r of (post.reactions || [])) {
    reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1
  }
  const totalReactions = (post.reactions || []).length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <button
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
          onClick={() => toggleReaction(userReaction || 'love')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.375rem 0.75rem', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 600,
            border: userReaction ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
            background: userReaction ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
            color: userReaction ? '#c4b5fd' : '#64748b',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          <span>{userReaction ? REACTIONS.find(r => r.key === userReaction)?.emoji || '❤️' : '❤️'}</span>
          <span>{totalReactions > 0 ? totalReactions : 'React'}</span>
        </button>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => setShowPicker(true)}
              onMouseLeave={() => setShowPicker(false)}
              style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
                background: 'rgba(18,18,32,0.98)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16,
                padding: '0.375rem', display: 'flex', gap: 4, zIndex: 30,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {REACTIONS.map(r => (
                <button key={r.key}
                  onClick={() => { toggleReaction(r.key); setShowPicker(false) }}
                  title={r.label}
                  style={{
                    fontSize: '1.25rem', padding: '0.375rem', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    background: userReaction === r.key ? 'rgba(139,92,246,0.2)' : 'transparent',
                    transform: userReaction === r.key ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.currentTarget.style.transform = userReaction === r.key ? 'scale(1.15)' : 'scale(1)'}
                >
                  {r.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reaction summary */}
      {Object.keys(reactionCounts).length > 0 && (
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(reactionCounts).slice(0, 3).map(([type, count]) => {
            const r = REACTIONS.find(x => x.key === type)
            return r ? (
              <span key={type} style={{ fontSize: '0.875rem' }} title={`${count} ${r.label}`}>{r.emoji}</span>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

export default function MovieCard({ post, currentUserId, priority = false }) {
  const { toggleSave, isSaving } = useWatchlist()
  const isSaved = post.saves?.some(s => s.user_id === currentUserId)
  const category = getCategoryById(post.category)
  const catColor = CAT_COLORS[post.category] || '#8b5cf6'
  const [showAllNotes, setShowAllNotes] = useState(false)
  const poster = getPosterUrl(post.poster_path)
  const postedBy = post.profiles

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: 'rgba(28,28,46,0.6)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139,92,246,0.12)', borderRadius: 20,
        overflow: 'hidden', transition: 'border-color .2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.12)'}
    >
      {/* Header — who posted */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem 0.75rem' }}>
        <Link href={`/profile/${postedBy?.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Avatar user={postedBy} size={34} />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0' }}>
              {postedBy?.name || 'A friend'}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>
              {post.created_at ? timeAgo(post.created_at) : ''}
            </p>
          </div>
        </Link>
        <button
          onClick={() => toggleSave(post.id)}
          disabled={isSaving}
          title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
          style={{
            background: 'none', border: 'none', cursor: isSaving ? 'wait' : 'pointer',
            color: isSaved ? '#f59e0b' : '#475569', padding: '0.375rem',
            borderRadius: 10, transition: 'color .15s', opacity: isSaving ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!isSaving) e.currentTarget.style.color = isSaved ? '#fbbf24' : '#94a3b8' }}
          onMouseLeave={e => e.currentTarget.style.color = isSaved ? '#f59e0b' : '#475569'}
        >
          {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: '1rem', padding: '0 1rem 1rem' }}>
        {/* Poster */}
        <div style={{ flexShrink: 0 }}>
          <Link href={`/movie/${post.tmdb_id}`}>
            <div style={{ position: 'relative', width: 88, height: 128, borderRadius: 12, overflow: 'hidden', background: '#1c1c2e', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <PosterImage src={poster} alt={post.title} fill sizes="88px" priority={priority} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.8),transparent)', padding: '0.375rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fbbf24' }}>{post.tmdb_rating?.toFixed(1)}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Category */}
          {category && (
            <div>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                fontSize: '0.7rem', fontWeight: 700,
                background: catColor + '33', border: `1px solid ${catColor}55`, color: catColor,
              }}>
                {category.label}
              </span>
            </div>
          )}

          {/* Title */}
          <Link href={`/movie/${post.tmdb_id}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.3, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
              onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}
            >
              {post.title}
            </h3>
          </Link>

          {/* Year + genres */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {post.release_year && <span style={{ fontSize: '0.75rem', color: '#475569' }}>{post.release_year}</span>}
            {post.genres?.slice(0, 3).map(g => (
              <span key={g} style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>{g}</span>
            ))}
          </div>

          {/* Notes */}
          {post.allNotes && post.allNotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(showAllNotes ? post.allNotes : post.allNotes.slice(0, 1)).map((n, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Avatar user={n.user} size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a78bfa' }}>{n.user?.name || 'Someone'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    "{n.note}"
                  </p>
                </div>
              ))}
              {post.allNotes.length > 1 && (
                <button onClick={() => setShowAllNotes(!showAllNotes)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', fontSize: '0.75rem', padding: 0, fontFamily: 'inherit' }}>
                  <MessageCircle size={12} />
                  {showAllNotes ? 'Show less' : `${post.allNotes.length - 1} more note${post.allNotes.length > 2 ? 's' : ''}`}
                  <ChevronDown size={12} style={{ transition: 'transform .2s', transform: showAllNotes ? 'rotate(180deg)' : 'none' }} />
                </button>
              )}
            </div>
          ) : post.personal_note ? (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.5rem 0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                "{post.personal_note}"
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reactions */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <ReactionBar post={post} />
      </div>
    </motion.article>
  )
}
