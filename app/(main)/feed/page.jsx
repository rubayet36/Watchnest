'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { Database, Film, Plus, Sparkles, Users, Activity } from 'lucide-react'
import { useFeed } from '@/hooks/useFeed'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useAuth } from '@/context/AuthContext'
import MovieCard from '@/components/feed/MovieCard'
import FeedFilters from '@/components/feed/FeedFilters'
import OfflineDraftsTray from '@/components/pwa/OfflineDraftsTray'
import { CardSkeleton, LoadingSpinner } from '@/components/ui/LoadingSpinner'

const FEED_GENRE_KEY = 'feed_genre'
const FEED_GENRE_EVENT = 'watchnest-feed-genre'
const FEED_TYPE_KEY = 'feed_type'
const FEED_TYPE_EVENT = 'watchnest-feed-type'

function getFeedGenreSnapshot() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(FEED_GENRE_KEY) || null
}

function getFeedGenreServerSnapshot() {
  return null
}

function subscribeToFeedGenre(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FEED_GENRE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(FEED_GENRE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function getFeedTypeSnapshot() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(FEED_TYPE_KEY) || null
}

function getFeedTypeServerSnapshot() {
  return null
}

function subscribeToFeedType(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FEED_TYPE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(FEED_TYPE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export default function HomePage() {
  const { user } = useAuth()
  const activeGenre = useSyncExternalStore(
    subscribeToFeedGenre,
    getFeedGenreSnapshot,
    getFeedGenreServerSnapshot
  )
  const activeType = useSyncExternalStore(
    subscribeToFeedType,
    getFeedTypeSnapshot,
    getFeedTypeServerSnapshot
  )

  const setActiveGenre = (genre) => {
    if (genre) sessionStorage.setItem(FEED_GENRE_KEY, genre)
    else sessionStorage.removeItem(FEED_GENRE_KEY)
    window.dispatchEvent(new Event(FEED_GENRE_EVENT))
  }

  const setActiveType = (type) => {
    if (type) sessionStorage.setItem(FEED_TYPE_KEY, type)
    else sessionStorage.removeItem(FEED_TYPE_KEY)
    window.dispatchEvent(new Event(FEED_TYPE_EVENT))
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useFeed({ genreFilter: activeGenre, mediaFilter: activeType })

  const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage)
  const posts = useMemo(() => {
    const seen = new Set()
    return (data?.pages.flatMap((p) => p.posts) ?? [])
      .filter((post) => {
        const key = post?.id || `${post?.media_type || 'movie'}-${post?.tmdb_id}-${post?.user_id || 'unknown'}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
  }, [data])

  return (
    <main className="feed-page page-shell mobile-safe-bottom" style={{ maxWidth: 680, margin: '0 auto', padding: '1.25rem 1rem', color: '#F2EFE9' }}>
      
      {/* Feed Hero Banner */}
      <header style={{
        background: '#15171C', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20, padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', color: '#F2EFE9', letterSpacing: '0.03em', lineHeight: 1 }}>
            COMMUNITY FEED
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{
            padding: '5px 10px', borderRadius: 8, background: 'rgba(63,221,168,0.12)',
            border: '1px solid rgba(63,221,168,0.3)', color: '#3FDDA8',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3FDDA8', boxShadow: '0 0 6px #3FDDA8' }} />
            LIVE FEED
          </div>
        </div>
      </header>

      {/* Filter Section */}
      <section style={{
        background: '#15171C', border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16, padding: '0.85rem 1rem', marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 800, color: '#F2EFE9', textTransform: 'uppercase' }}>
            <Sparkles size={14} style={{ color: '#FF6A3D' }} />
            <span>DISCOVER FILTERS</span>
          </div>
          {(activeGenre || activeType) && (
            <button
              type="button"
              onClick={() => { setActiveGenre(null); setActiveType(null) }}
              style={{
                background: 'none', border: 'none', color: '#FF6A3D',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>
        <FeedFilters activeGenre={activeGenre} activeType={activeType} onGenreChange={setActiveGenre} onTypeChange={setActiveType} />
      </section>

      <OfflineDraftsTray />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <section style={{ textAlign: 'center', padding: '3rem 1rem', background: '#15171C', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Database size={36} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
          <h2 style={{ color: '#F2EFE9', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', margin: '0 0 0.5rem' }}>DATABASE NOT CONNECTED</h2>
          <p style={{ color: '#9A9CA3', fontSize: '0.85rem', margin: 0 }}>Run the schema migration in Supabase SQL Editor.</p>
        </section>
      ) : posts.length === 0 ? (
        <section style={{ textAlign: 'center', padding: '3rem 1rem', background: '#15171C', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Film size={36} style={{ color: '#FF6A3D', marginBottom: '0.75rem' }} />
          <h2 style={{ color: '#F2EFE9', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.85rem', margin: '0 0 0.5rem' }}>
            {activeGenre || activeType ? 'NO MATCHING PICKS YET' : 'YOUR FEED IS EMPTY'}
          </h2>
          <p style={{ color: '#9A9CA3', fontSize: '0.85rem', margin: '0 0 1.25rem', maxWidth: '24rem', marginInline: 'auto' }}>
            {activeGenre || activeType
              ? 'No one has shared a title for this filter yet.'
              : 'Add a title or connect with a partner to start filling your feed.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/" className="btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem', textDecoration: 'none' }}>
              <Plus size={14} /> Find Titles
            </Link>
            <Link href="/watchlist" style={{
              padding: '0.55rem 1.25rem', fontSize: '0.82rem', textDecoration: 'none',
              background: '#15171C', border: '1px solid rgba(255,255,255,0.12)', color: '#F2EFE9',
              borderRadius: 11, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Users size={14} /> Watchlist
            </Link>
          </div>
        </section>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} aria-label="Movie recommendation feed">
          {posts.map((post, i) => (
            <MovieCard key={post.id} post={post} currentUserId={user?.id} priority={i === 0} />
          ))}

          <div ref={sentinelRef} style={{ height: 20 }} />

          {isFetchingNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
              <LoadingSpinner size="md" />
            </div>
          )}

          {!hasNextPage && posts.length > 0 && (
            <p style={{ textAlign: 'center', color: '#9A9CA3', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', margin: '1.5rem 0' }}>
              YOU HAVE SEEN ALL RECOMMENDATIONS
            </p>
          )}
        </section>
      )}
    </main>
  )
}
