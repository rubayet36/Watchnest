'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ChevronDown, Edit2, MessageCircle, MessageSquareText, Share2, ShieldAlert, Star, Users } from 'lucide-react'
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
  'all-time-fav': '#d97706',
  'made-me-cry': '#3b82f6',
  'best-comedy': '#22c55e',
  'mind-blowing': '#8b5cf6',
  'watch-family': '#f97316',
  'best-thriller': '#64748b',
  'best-horror': '#dc2626',
  'must-watch': '#ef4444',
  'hidden-gem': '#06b6d4',
  'best-scifi': '#0ea5e9',
  'date-movie': '#ec4899',
  'underrated': '#84cc16',
  'rewatchable': '#a855f7',
}

function ReactionBar({ post }) {
  const { user } = useAuth()
  const { toggleReaction } = useReactions(post.id)
  const [showPicker, setShowPicker] = useState(false)

  const reactionCounts = { ...(post.reactionCounts || {}) }
  const userReaction = post.reactions?.find((r) => r.user_id === user?.id)?.reaction_type
  if (!post.reactionCounts) {
    for (const r of (post.reactions || [])) {
      reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1
    }
  }

  const activeReaction = REACTIONS.find((r) => r.key === userReaction)
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + Number(count || 0), 0)
  const reactionSummary = Object.entries(reactionCounts).slice(0, 3)

  return (
    <div className="feed-reaction-wrap">
      <div className="feed-reaction-trigger">
        <button
          type="button"
          aria-label="React to recommendation"
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
          onClick={() => toggleReaction(userReaction || 'love')}
          className={`feed-action-pill ${userReaction ? 'is-active' : ''}`}
        >
          <span className="feed-action-emoji">{activeReaction?.emoji || REACTIONS[0]?.emoji}</span>
          <span>{totalReactions > 0 ? totalReactions : 'React'}</span>
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
              className="feed-reaction-picker"
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
                  className={`feed-reaction-option ${userReaction === reaction.key ? 'is-selected' : ''}`}
                >
                  {reaction.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reactionSummary.length > 0 && (
        <div className="feed-reaction-summary" aria-label="Reaction summary">
          {reactionSummary.map(([type, count]) => {
            const reaction = REACTIONS.find((r) => r.key === type)
            return reaction ? (
              <span key={type} title={`${count} ${reaction.label}`}>{reaction.emoji}</span>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

function hasReviewMeta({ rating, moodTags, whyWatch }) {
  const numericRating = Number(rating)
  const hasRating = Number.isFinite(numericRating) && numericRating > 0
  const tags = Array.isArray(moodTags) ? moodTags.filter(Boolean) : []

  return hasRating || tags.length > 0 || Boolean(whyWatch)
}

function ReviewMeta({ rating, moodTags, whyWatch, ratingLabel = 'Personal rating' }) {
  const numericRating = Number(rating)
  const hasRating = Number.isFinite(numericRating) && numericRating > 0
  const tags = Array.isArray(moodTags) ? moodTags.filter(Boolean) : []

  if (!hasRating && tags.length === 0 && !whyWatch) return null

  return (
    <div className="feed-review-meta">
      {hasRating && (
        <span className="feed-review-rating">
          <Star size={12} />
          {ratingLabel} {numericRating.toFixed(1)}/10
        </span>
      )}
      {tags.map((tag) => (
        <span key={tag} className="feed-mood-pill">{tag}</span>
      ))}
      {whyWatch && <p className="feed-why-watch"><strong>Why watch:</strong> {whyWatch}</p>}
    </div>
  )
}

function SpoilerNote({ children, hasSpoilers }) {
  const [revealed, setRevealed] = useState(!hasSpoilers)

  if (!hasSpoilers || revealed) return children

  return (
    <div className="feed-spoiler-guard">
      <ShieldAlert size={15} />
      <span>Spoiler-safe note hidden</span>
      <button type="button" onClick={() => setRevealed(true)}>Reveal</button>
    </div>
  )
}

export default function MovieCard({ post, currentUserId, priority = false }) {
  const { toggleSave, isSaving } = useWatchlist()
  const isSaved = post.saves?.some((s) => s.user_id === currentUserId)
  const category = getCategoryById(post.category)
  const catColor = CAT_COLORS[post.category] || '#8b5cf6'
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const poster = getPosterUrl(post.poster_path, 'w342')
  const postedBy = post.profiles
  const profileHref = postedBy?.id || post.user_id ? `/profile/${postedBy?.id || post.user_id}` : '/'
  const alsoRecommendedBy = post.recommendedBy || []
  const rating = Number(post.tmdb_rating)
  const hasRating = Number.isFinite(rating) && rating > 0
  const visibleNotes = showAllNotes ? post.allNotes : post.allNotes?.slice(0, 1)
  const primaryReviewMeta = {
    rating: post.user_rating,
    moodTags: post.mood_tags,
    whyWatch: post.why_watch,
  }
  const showPrimaryReviewMeta = hasReviewMeta(primaryReviewMeta)

  const isAnime = post.genres?.includes('Animation') && post.media_type === 'tv'
  const mediaLabel = isAnime ? 'ANIME' : (post.media_type === 'tv' ? 'TV SERIES' : 'MOVIE')
  const mediaColor = isAnime ? '#ec4899' : (post.media_type === 'tv' ? '#3b82f6' : '#10b981')

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="movie-card feed-card"
      style={{ '--feed-accent': catColor, '--media-color': mediaColor }}
    >
      <div className="feed-card-accent" />

      <header className="feed-card-header">
        <Link href={profileHref} className="feed-author">
          <Avatar user={postedBy} size={38} />
          <span className="feed-author-copy">
            <span className="feed-user-name feed-author-name">{postedBy?.name || 'A friend'}</span>
            <span className="feed-time">{post.created_at ? timeAgo(post.created_at) : ''}</span>
          </span>
        </Link>

        <div className="feed-card-actions">
          {currentUserId === post.user_id && (
            <button type="button" onClick={() => setShowEdit(true)} className="feed-icon-button" aria-label="Edit post">
              <Edit2 size={17} />
            </button>
          )}
          <button type="button" onClick={() => setShowShare(true)} className="feed-icon-button" aria-label="Share with a partner">
            <Share2 size={17} />
          </button>
          <button
            type="button"
            onClick={() => toggleSave(post.id)}
            disabled={isSaving}
            className={`feed-icon-button ${isSaved ? 'is-saved' : ''}`}
            aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        </div>
      </header>

      <div className="feed-card-body">
        <Link href={`/media/${post.media_type || 'movie'}/${post.tmdb_id}`} className="feed-poster-link" aria-label={`Open ${post.title}`}>
          <span className="feed-poster-shell">
            <PosterImage src={poster} alt={post.title} fill sizes="(max-width: 460px) 88px, 112px" priority={priority} />
            {hasRating && (
              <span className="feed-rating-badge">
                <Star size={11} />
                <span>{rating.toFixed(1)}</span>
              </span>
            )}
          </span>
        </Link>

        <div className="feed-card-content">
          <div className="feed-badges">
            {category && (
              <span className="feed-badge" style={{ '--badge-color': catColor }}>
                {category.label}
              </span>
            )}
            <span className="feed-badge" style={{ '--badge-color': mediaColor }}>
              {mediaLabel}
            </span>
          </div>

          <Link href={`/media/${post.media_type || 'movie'}/${post.tmdb_id}`} className="feed-title-link">
            <h3 className="feed-title">{post.title}</h3>
          </Link>

          <div className="feed-meta-line">
            {post.release_year && <span>{post.release_year}</span>}
            {post.genres?.slice(0, 3).map((genre, index) => (
              <span key={`${genre}-${index}`} className="feed-genre-pill">{genre}</span>
            ))}
          </div>

          {showPrimaryReviewMeta && (
            <ReviewMeta {...primaryReviewMeta} />
          )}

          {alsoRecommendedBy.length > 0 && (
            <div className="feed-recommend-row">
              <div className="feed-recommend-avatars">
                {alsoRecommendedBy.slice(0, 3).map((u) => (
                  <Avatar key={u.id} user={u} size={22} />
                ))}
              </div>
              <div className="feed-recommend-copy">
                <Users size={13} />
                <span>
                  Also recommended by{' '}
                  <strong className="feed-user-name">
                    {alsoRecommendedBy[0]?.name || alsoRecommendedBy[0]?.username || 'someone'}
                  </strong>
                  {alsoRecommendedBy.length > 1 ? ` and ${alsoRecommendedBy.length - 1} other${alsoRecommendedBy.length > 2 ? 's' : ''}` : ''}
                </span>
              </div>
            </div>
          )}

          {post.allNotes && post.allNotes.length > 0 ? (
            <div className="feed-notes">
              {visibleNotes.map((note, index) => (
                <div key={`${note.postId || index}-${note.postedAt || index}`} className="feed-note">
                  <div className="feed-note-author">
                    <Avatar user={note.user} size={17} />
                    <span className="feed-user-name">{note.user?.name || 'Someone'}</span>
                  </div>
                  {note.note && (
                    <SpoilerNote hasSpoilers={note.contains_spoilers}>
                      <p className="feed-note-text">&ldquo;{note.note}&rdquo;</p>
                    </SpoilerNote>
                  )}
                  {note.postId !== post.id && (
                    <ReviewMeta rating={note.user_rating} moodTags={note.mood_tags} whyWatch={note.why_watch} ratingLabel="Rating" />
                  )}
                </div>
              ))}
              {post.allNotes.length > 1 && (
                <button type="button" onClick={() => setShowAllNotes(!showAllNotes)} className="feed-note-toggle">
                  <MessageCircle size={12} />
                  <span>{showAllNotes ? 'Show less' : `${post.allNotes.length - 1} more note${post.allNotes.length > 2 ? 's' : ''}`}</span>
                  <ChevronDown size={12} className={showAllNotes ? 'is-open' : ''} />
                </button>
              )}
            </div>
          ) : post.personal_note ? (
            <div className="feed-notes">
              <div className="feed-note">
                <SpoilerNote hasSpoilers={post.contains_spoilers}>
                  <p className="feed-note-text">&ldquo;{post.personal_note}&rdquo;</p>
                </SpoilerNote>
              </div>
            </div>
          ) : (
            null
          )}
        </div>
      </div>

      <footer className="feed-card-footer">
        <ReactionBar post={post} />

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className={`feed-action-pill ${showComments ? 'is-comment-open' : ''}`}
        >
          <MessageSquareText size={16} />
          <span>Comment</span>
        </button>
      </footer>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="feed-comments-motion"
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
