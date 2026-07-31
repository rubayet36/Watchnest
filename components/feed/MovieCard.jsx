'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, Heart, MessageSquare, Share2, Star, MoreHorizontal, Edit2, ShieldAlert } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import PosterImage from '@/components/ui/PosterImage'
import { getCategoryById, REACTIONS, timeAgo } from '@/lib/utils'
import { useReactions, useWatchlist } from '@/hooks/useReactions'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import ShareModal from '@/components/feed/ShareModal'
import EditPostModal from '@/components/movie/EditPostModal'
import CommentSection from '@/components/feed/CommentSection'

const CAT_COLORS = {
  'all-time-fav': '#E8B23D',
  'made-me-cry': '#3FDDA8',
  'best-comedy': '#3FDDA8',
  'mind-blowing': '#FF6A3D',
  'watch-family': '#FF6A3D',
  'best-thriller': '#FF6A3D',
  'best-horror': '#ef4444',
  'must-watch': '#FF6A3D',
  'hidden-gem': '#E8B23D',
  'best-scifi': '#3FDDA8',
  'date-movie': '#ec4899',
  'underrated': '#3FDDA8',
  'rewatchable': '#FF6A3D',
}

function SpoilerNote({ children, hasSpoilers }) {
  const [revealed, setRevealed] = useState(!hasSpoilers)

  if (!hasSpoilers || revealed) return children

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
      <ShieldAlert size={14} />
      <span>Spoiler-safe note hidden</span>
      <button type="button" onClick={() => setRevealed(true)} style={{ background: 'none', border: 'none', color: '#F2EFE9', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}>
        Reveal
      </button>
    </div>
  )
}

export default function MovieCard({ post, currentUserId, priority = false }) {
  const { user } = useAuth()
  const { toggleSave, isSaving } = useWatchlist()
  const { toggleReaction } = useReactions(post.id)

  const isSaved = post.saves?.some((s) => s.user_id === currentUserId)
  const category = getCategoryById(post.category)
  const catColor = CAT_COLORS[post.category] || '#FF6A3D'

  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const poster = getPosterUrl(post.poster_path, 'w780')
  const postedBy = post.profiles
  const profileHref = postedBy?.id || post.user_id ? `/profile/${postedBy?.id || post.user_id}` : '/'
  const alsoRecommendedBy = post.recommendedBy || []
  const rating = Number(post.tmdb_rating)
  const hasRating = Number.isFinite(rating) && rating > 0

  const isAnime = post.genres?.includes('Animation') && post.media_type === 'tv'
  const mediaLabel = isAnime ? 'Anime' : (post.media_type === 'tv' ? 'TV Series' : 'Movie')

  // Reactions count
  const reactionCounts = { ...(post.reactionCounts || {}) }
  const userReaction = post.reactions?.find((r) => r.user_id === user?.id)?.reaction_type
  if (!post.reactionCounts) {
    for (const r of (post.reactions || [])) {
      reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1
    }
  }
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + Number(count || 0), 0)
  const activeReaction = REACTIONS.find((r) => r.key === userReaction)

  // Recommendation author text line
  const authorLine = useMemo(() => {
    const firstName = postedBy?.name || postedBy?.username || 'Noname'
    if (alsoRecommendedBy.length > 0) {
      const partnerName = alsoRecommendedBy[0]?.name || alsoRecommendedBy[0]?.username
      return (
        <span>
          <strong style={{ color: '#F2EFE9', fontWeight: 800 }}>{firstName}</strong> and{' '}
          <strong style={{ color: '#F2EFE9', fontWeight: 800 }}>{partnerName}</strong> recommended
        </span>
      )
    }
    return (
      <span>
        <strong style={{ color: '#F2EFE9', fontWeight: 800 }}>{firstName}</strong> recommended
      </span>
    )
  }, [postedBy, alsoRecommendedBy])

  const genreLine = post.genres?.length ? post.genres.slice(0, 3).join(', ') : ''

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#15171C',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '0.85rem 1rem 0.65rem',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        marginBottom: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── 1. Header Row ────────────────────────────────────────── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <Link href={profileHref} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', minWidth: 0 }}>
          <Avatar user={postedBy} size={36} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#9A9CA3', fontFamily: "'Manrope', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authorLine}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {post.created_at ? timeAgo(post.created_at) : ''}
            </div>
          </div>
        </Link>

        {currentUserId === post.user_id ? (
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            style={{
              background: 'none', border: 'none', color: '#9A9CA3', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: '4px'
            }}
          >
            <MoreHorizontal size={18} />
          </button>
        ) : (
          <div style={{ width: 18 }} />
        )}
      </header>

      {/* ── 2. Full-Width Poster Card Frame ──────────────────────── */}
      <Link href={`/media/${post.media_type || 'movie'}/${post.tmdb_id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#0D0E12',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        }}>
          <PosterImage
            src={poster}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 680px"
            priority={priority}
            style={{ objectFit: 'cover' }}
          />

          {/* Top-Left Media Type Badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 3,
            padding: '3px 9px', borderRadius: 99,
            background: 'rgba(10, 11, 14, 0.75)', backdropFilter: 'blur(8px)',
            border: '1px solid #3FDDA8', color: '#3FDDA8',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800
          }}>
            {mediaLabel}
          </div>

          {/* Top-Right Category or Rating Badge */}
          {hasRating && (
            <div style={{
              position: 'absolute', top: 10, right: 10, zIndex: 3,
              padding: '3px 8px', borderRadius: 8,
              background: 'rgba(10, 11, 14, 0.75)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(232, 178, 61, 0.4)', color: '#E8B23D',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Star size={11} fill="#E8B23D" color="#E8B23D" />
              {rating.toFixed(1)}
            </div>
          )}

          {/* Bottom Title & Meta Gradient Scrim */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(to top, rgba(10, 11, 14, 0.95) 0%, rgba(10, 11, 14, 0.4) 40%, transparent 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '14px 16px'
          }}>
            <h3 style={{
              margin: 0, color: '#F2EFE9', fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', letterSpacing: '0.02em', lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}>
              {post.title}
            </h3>
            <p style={{
              margin: '3px 0 0', color: '#9A9CA3', fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem', fontWeight: 600
            }}>
              {post.release_year ? `${post.release_year}` : ''}
              {post.release_year && genreLine ? ' · ' : ''}
              {genreLine}
            </p>
          </div>
        </div>
      </Link>

      {/* Optional Note / Review Box */}
      {post.personal_note && (
        <div style={{
          marginTop: '0.65rem', padding: '0.65rem 0.85rem',
          background: '#0D0E12', borderRadius: '10px',
          borderLeft: `3px solid ${catColor}`,
          fontSize: '0.82rem', color: '#F2EFE9', fontFamily: "'Manrope', sans-serif", fontStyle: 'italic'
        }}>
          <SpoilerNote hasSpoilers={post.contains_spoilers}>
            &ldquo;{post.personal_note}&rdquo;
          </SpoilerNote>
        </div>
      )}

      {/* ── 3. Action Footer Bar ─────────────────────────────────── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '0.65rem', paddingTop: '0.45rem',
      }}>
        {/* Left Actions: React, Comment, Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* React Button with Popover */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onMouseEnter={() => setShowPicker(true)}
              onMouseLeave={() => setShowPicker(false)}
              onClick={() => toggleReaction(userReaction || 'love')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                color: userReaction ? '#FF6A3D' : '#9A9CA3',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700
              }}
            >
              <Heart size={16} fill={userReaction ? '#FF6A3D' : 'none'} color={userReaction ? '#FF6A3D' : '#9A9CA3'} />
              <span>{totalReactions > 0 ? totalReactions : ''}</span>
            </button>

            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={() => setShowPicker(true)}
                  onMouseLeave={() => setShowPicker(false)}
                  style={{
                    position: 'absolute', bottom: '100%', left: 0, mb: 6,
                    background: '#15171C', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 99, padding: '4px 8px', display: 'flex', gap: 4, zIndex: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                  }}
                >
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction.key}
                      type="button"
                      onClick={() => {
                        toggleReaction(reaction.key)
                        setShowPicker(false)
                      }}
                      title={reaction.label}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px'
                      }}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comment Count */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              color: showComments ? '#FF6A3D' : '#9A9CA3',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 700
            }}
          >
            <MessageSquare size={16} />
            <span>{post.comments_count || (post.comments ? post.comments.length : '')}</span>
          </button>

          {/* Share with Partner */}
          <button
            type="button"
            onClick={() => setShowShare(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', color: '#9A9CA3'
            }}
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Right Action: Bookmark Watchlist */}
        <button
          type="button"
          onClick={() => toggleSave(post.id)}
          disabled={isSaving}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            color: isSaved ? '#FF6A3D' : '#9A9CA3'
          }}
          aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isSaved ? <BookmarkCheck size={18} fill="#FF6A3D" color="#FF6A3D" /> : <Bookmark size={18} />}
        </button>
      </footer>

      {/* ── 4. Comments Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <CommentSection post={post} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
        {showEdit && <EditPostModal post={post} onClose={() => setShowEdit(false)} />}
      </AnimatePresence>
    </motion.article>
  )
}
