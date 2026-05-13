'use client'

import { use, useState } from 'react'
import { useProfile, useUserPosts } from '@/hooks/useProfile'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'
import Link from 'next/link'
import { getPosterUrl } from '@/lib/tmdb'
import { getCategoryById, CATEGORIES, timeAgo } from '@/lib/utils'
import { CardSkeleton, EmptyState } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import MovieCard from '@/components/feed/MovieCard'
import { Film, Star, Calendar, Grid, List } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilePage({ params }) {
  const { userId } = use(params)
  const { user, profile: myProfile } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(userId)
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId)
  const [activeCategory, setActiveCategory] = useState(null)
  const [view, setView] = useState('grid')

  const isOwnProfile = user?.id === userId

  // Use own profile from context if on own page and DB profile not loaded
  const displayProfile = profile || (isOwnProfile ? myProfile : null)

  const totalMovies = posts?.length || 0
  const genres = posts?.flatMap(p => p.genres || []) || []
  const genreCounts = genres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {})
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const filteredPosts = activeCategory
    ? posts?.filter(p => p.category === activeCategory)
    : posts

  // Show skeleton only briefly if no profile at all
  if (profileLoading && !displayProfile) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ height: 140, borderRadius: 20, marginBottom: 16 }} className="shimmer" />
        <CardSkeleton />
      </div>
    )
  }

  if (!displayProfile) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem' }}>👤</p>
        <h2 style={{ color: '#e2e8f0', marginTop: '1rem' }}>Profile not found</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>This user doesn't exist or hasn't set up their profile yet.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(28,28,46,0.7)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.15)', borderRadius: 20,
          padding: '1.5rem', marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <Avatar user={displayProfile} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
                  {displayProfile.name || 'User'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '2px 0 0' }}>
                  @{displayProfile.username || displayProfile.email?.split('@')[0] || 'user'}
                </p>
              </div>
              {isOwnProfile && (
                <Link href="/settings" style={{
                  padding: '0.375rem 0.875rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: '0.8125rem', textDecoration: 'none',
                  transition: 'all .15s',
                }}>Edit</Link>
              )}
            </div>
            {displayProfile.bio && (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                {displayProfile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem', marginTop: '1.25rem',
          paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          {[
            { icon: '🎬', value: totalMovies, label: 'Movies' },
            { icon: '⭐', value: topGenre || '—', label: 'Top Genre' },
            { icon: '📅', value: displayProfile.created_at ? new Date(displayProfile.created_at).getFullYear() : '—', label: 'Joined' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.125rem', marginBottom: 2 }}>{icon}</div>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 700, color: '#e2e8f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{value}</div>
              <div style={{ fontSize: '0.6875rem', color: '#475569', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Category filter */}
      {posts && posts.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem', paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: '0.5rem', minWidth: 'max-content' }}>
            <button onClick={() => setActiveCategory(null)} style={{
              padding: '0.375rem 0.875rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: !activeCategory ? '#7c3aed' : 'rgba(255,255,255,0.05)',
              color: !activeCategory ? '#fff' : '#64748b',
              outline: !activeCategory ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}>All ({totalMovies})</button>
            {CATEGORIES.filter(cat => posts?.some(p => p.category === cat.id)).map(cat => {
              const count = posts?.filter(p => p.category === cat.id).length
              const active = activeCategory === cat.id
              return (
                <button key={cat.id} onClick={() => setActiveCategory(active ? null : cat.id)} style={{
                  padding: '0.375rem 0.875rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                  color: active ? '#fff' : '#64748b',
                  outline: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}>{cat.label} ({count})</button>
              )
            })}
          </div>
        </div>
      )}

      {/* View toggle */}
      {posts && posts.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[['grid', '⊞ Grid'], ['feed', '☰ Feed']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '0.375rem 0.875rem', borderRadius: 10, fontSize: '0.8rem',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: view === v ? 'rgba(124,58,237,0.2)' : 'transparent',
              color: view === v ? '#a78bfa' : '#475569',
              outline: view === v ? '1px solid rgba(124,58,237,0.3)' : 'none',
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* Posts */}
      {postsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <CardSkeleton /><CardSkeleton />
        </div>
      ) : !filteredPosts || filteredPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '3rem' }}>🎬</p>
          <h3 style={{ color: '#e2e8f0', marginTop: '0.75rem', fontWeight: 600 }}>
            {activeCategory ? 'No movies in this category' : 'No movies yet'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {isOwnProfile ? 'Click + Add Movie to share your first pick!' : `${displayProfile.name} hasn't added any movies yet.`}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {filteredPosts.map((post, i) => (
            <motion.div key={post.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              style={{ minWidth: 0 }}
            >
              <Link href={`/movie/${post.tmdb_id}`} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', background: '#1c1c2e' }}
                  className="poster-hover">
                  <Image src={getPosterUrl(post.poster_path)} alt={post.title}
                    fill style={{ objectFit: 'cover' }} sizes="33vw" />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.title}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map(post => (
            <MovieCard key={post.id} post={{ ...post, profiles: displayProfile }} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  )
}
