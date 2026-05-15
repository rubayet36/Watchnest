'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Database, Film, Plus, Sparkles, Users } from 'lucide-react'
import { useFeed } from '@/hooks/useFeed'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useAuth } from '@/context/AuthContext'
import MovieCard from '@/components/feed/MovieCard'
import FeedFilters from '@/components/feed/FeedFilters'
import OfflineDraftsTray from '@/components/pwa/OfflineDraftsTray'
import { CardSkeleton, LoadingSpinner } from '@/components/ui/LoadingSpinner'

const FEED_GENRE_KEY = 'feed_genre'
const FEED_GENRE_EVENT = 'watchnest-feed-genre'

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

export default function HomePage() {
  const { user } = useAuth()
  const activeGenre = useSyncExternalStore(
    subscribeToFeedGenre,
    getFeedGenreSnapshot,
    getFeedGenreServerSnapshot
  )

  const setActiveGenre = (genre) => {
    if (genre) sessionStorage.setItem(FEED_GENRE_KEY, genre)
    else sessionStorage.removeItem(FEED_GENRE_KEY)
    window.dispatchEvent(new Event(FEED_GENRE_EVENT))
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useFeed({ genreFilter: activeGenre })

  const sentinelRef = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage)
  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <main className="feed-page page-shell mobile-safe-bottom">
      <header className="feed-hero glass-panel">
        <div className="feed-hero-copy">
          <p className="page-kicker">Your Nest</p>
          <h1 className="page-title gradient-text">Latest picks</h1>
          <p className="page-subtitle">Movies and shows your circle is talking about.</p>
        </div>

        <div className="feed-hero-metrics" aria-label="Feed overview">
          <div>
            <span>Mode</span>
            <strong>{activeGenre || 'All'}</strong>
          </div>
          <div>
            <span>Loaded</span>
            <strong>{isLoading ? '--' : posts.length}</strong>
          </div>
        </div>
      </header>

      <section className="feed-filter-panel glass-panel">
        <div className="feed-filter-title-row">
          <div className="feed-filter-title">
            <Sparkles size={16} />
            <span>Browse by genre</span>
          </div>
          {activeGenre && (
            <button type="button" className="feed-clear-filter" onClick={() => setActiveGenre(null)}>
              Clear
            </button>
          )}
        </div>
        <FeedFilters activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      </section>

      <OfflineDraftsTray />

      {isLoading ? (
        <div className="feed-stack">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <section className="home-state feed-state glass-panel">
          <Database size={32} />
          <h2>Database not set up yet</h2>
          <p>Run the SQL schema in Supabase first: supabase/schema.sql.</p>
        </section>
      ) : posts.length === 0 ? (
        <section className="home-state feed-state glass-panel">
          <Film size={36} />
          <h2>{activeGenre ? `No ${activeGenre} picks yet` : 'Your nest is empty'}</h2>
          <p>
            {activeGenre
              ? `No one has shared a ${activeGenre} title yet.`
              : 'Add a title or invite a movie partner to start filling the feed.'}
          </p>
          <div className="home-state-actions">
            <Link href="/search"><Plus size={15} /> Find titles</Link>
            <Link href="/watchlist"><Users size={15} /> Watchlist</Link>
          </div>
        </section>
      ) : (
        <section className="feed-stack" aria-label="Movie recommendation feed">
          {posts.map((post, i) => (
            <MovieCard key={`${post.media_type || 'movie'}-${post.tmdb_id}-${post.id}`} post={post} currentUserId={user?.id} priority={i === 0} />
          ))}

          <div ref={sentinelRef} className="feed-sentinel" />

          {isFetchingNextPage && (
            <div className="feed-loading-more">
              <LoadingSpinner size="md" />
            </div>
          )}

          {!hasNextPage && posts.length > 0 && (
            <p className="feed-end">You have seen everything in the nest</p>
          )}
        </section>
      )}
    </main>
  )
}
