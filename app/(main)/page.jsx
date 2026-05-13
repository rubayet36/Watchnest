'use client'

import { useState } from 'react'
import { useFeed } from '@/hooks/useFeed'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useAuth } from '@/context/AuthContext'
import MovieCard from '@/components/feed/MovieCard'
import FeedFilters from '@/components/feed/FeedFilters'
import { CardSkeleton, EmptyState, LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { user } = useAuth()
  const [activeGenre, setActiveGenreState] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('feed_genre') || null
    }
    return null
  })

  const setActiveGenre = (genre) => {
    setActiveGenreState(genre)
    if (genre) sessionStorage.setItem('feed_genre', genre)
    else sessionStorage.removeItem('feed_genre')
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useFeed({ genreFilter: activeGenre })

  const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage)

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 900, marginBottom: 4,
          background: 'linear-gradient(135deg, #a78bfa, #f43f5e)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Your Nest 🎬
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Latest picks from your circle
        </p>
      </div>

      {/* Genre Filters */}
      <div style={{ marginBottom: '1.25rem' }}>
        <FeedFilters activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      </div>

      {/* Feed */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div style={{
          textAlign: 'center', padding: '3rem 1rem',
          background: 'rgba(244,63,94,0.06)',
          border: '1px solid rgba(244,63,94,0.15)',
          borderRadius: 16, marginTop: '1rem',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</p>
          <p style={{ color: '#fda4af', fontWeight: 600, marginBottom: '0.5rem' }}>
            Database not set up yet
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Run the SQL schema in Supabase first:<br />
            <span style={{ color: '#a78bfa' }}>supabase/schema.sql</span> → Supabase SQL Editor → Run ▶️
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪺</div>
          <h2 style={{ color: '#e2e8f0', fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
            {activeGenre ? `No ${activeGenre} movies yet` : 'Your nest is empty'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 1.5rem' }}>
            {activeGenre
              ? `Be the first to add a ${activeGenre} film to the nest!`
              : 'Start by adding a movie you love — your friends will see it here and can share their picks too.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 260, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, textAlign: 'left' }}>
              <span style={{ fontSize: '1.25rem' }}>➕</span>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Tap <strong style={{ color: '#a78bfa' }}>+ Add Movie</strong> to share your first pick</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, textAlign: 'left' }}>
              <span style={{ fontSize: '1.25rem' }}>🤝</span>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Go to <strong style={{ color: '#a78bfa' }}>Watchlist</strong> to invite friends</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post, i) => (
            <MovieCard key={`${post.tmdb_id}-${post.id}`} post={post} currentUserId={user?.id} priority={i === 0} />
          ))}

          <div ref={sentinelRef} style={{ height: 16 }} />

          {isFetchingNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <LoadingSpinner size="md" />
            </div>
          )}

          {!hasNextPage && posts.length > 0 && (
            <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.875rem', padding: '1.5rem' }}>
              You've seen everything in the nest 🪺
            </p>
          )}
        </div>
      )}
    </div>
  )
}
