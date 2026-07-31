'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfile, useUserPosts } from '@/hooks/useProfile'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'
import Link from 'next/link'
import { getPosterUrl } from '@/lib/tmdb'
import { CATEGORIES } from '@/lib/utils'
import { CardSkeleton } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import MovieCard from '@/components/feed/MovieCard'
import { Film, Star, Camera, Upload, Trash2, Save, X, LogOut, ShieldCheck, Edit3, Grid, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import UserReviewsModal from '@/components/profile/UserReviewsModal'
import AdminApprovalPanel from '@/components/profile/AdminApprovalPanel'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage({ params }) {
  const { userId } = use(params)
  const { user, profile: myProfile, updateProfile, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(userId)
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId)
  const [activeCategory, setActiveCategory] = useState(null)
  const [view, setView] = useState('grid')
  const [showReviews, setShowReviews] = useState(false)

  // Edit Profile modal states
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  const queryClient = useQueryClient()

  // Fetch reviews for avg rating
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', userId],
    queryFn: () => fetch(`/api/reviews?user=${userId}`).then(r => r.json()),
    enabled: !!userId,
  })
  const reviews = reviewsData?.reviews || []
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '—'

  const isOwnProfile = user?.id === userId

  const displayProfile = isOwnProfile
    ? { ...(profile || {}), ...(myProfile || {}) }
    : profile
  const isAdminProfile = (
    myProfile?.account_type === 'admin' ||
    profile?.account_type === 'admin' ||
    displayProfile?.account_type === 'admin'
  )

  const totalMovies = posts?.length || 0
  const genres = posts?.flatMap(p => p.genres || []) || []
  const genreCounts = genres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {})
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const filteredPosts = activeCategory
    ? posts?.filter(p => p.category === activeCategory)
    : posts

  const openEditModal = () => {
    setEditName(displayProfile?.name || '')
    setEditBio(displayProfile?.bio || '')
    setEditAvatarUrl(displayProfile?.avatar_url || '')
    setShowEditProfile(true)
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!user) {
      toast.error('Sign in again before uploading a picture')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Use a JPG, PNG, WebP, or GIF image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be under 5 MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`
      const { error } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        })

      if (error) throw error

      const { data } = supabase.storage.from('profile-avatars').getPublicUrl(filePath)
      const nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`
      const { error: saveError } = await updateProfile({ avatar_url: nextAvatarUrl })
      if (saveError) throw new Error('Picture uploaded, but profile update failed')

      setEditAvatarUrl(nextAvatarUrl)
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      toast.success('Profile picture updated')
    } catch (error) {
      toast.error(error.message || 'Could not upload picture')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleAvatarRemove() {
    setUploadingAvatar(true)
    const { error } = await updateProfile({ avatar_url: null })
    setUploadingAvatar(false)
    if (error) {
      toast.error('Could not remove picture')
      return
    }
    setEditAvatarUrl('')
    queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    toast.success('Profile picture removed')
  }

  async function handleSave() {
    if (!editName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSaving(true)
    const { error } = await updateProfile({
      name: editName.trim(),
      bio: editBio.trim(),
      avatar_url: editAvatarUrl || null
    })
    setSaving(false)
    if (error) {
      toast.error('Failed to save changes')
    } else {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      toast.success('Profile updated')
      setShowEditProfile(false)
    }
  }

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
        <h2 style={{ color: '#F2EFE9', marginTop: '1rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem' }}>PROFILE NOT FOUND</h2>
        <p style={{ color: '#9A9CA3', marginTop: '0.5rem', fontSize: '0.85rem' }}>This user doesn&apos;t exist or hasn&apos;t set up their profile yet.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.25rem 1rem', color: '#F2EFE9' }}>

      {/* Main Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#15171C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          padding: '1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Avatar user={displayProfile} size={76} />
            {displayProfile.account_type === 'admin' && (
              <span style={{
                position: 'absolute', bottom: -2, right: -2, background: '#E8B23D', color: '#0A0B0E',
                padding: '2px 5px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem', fontWeight: 900
              }}>
                ADMIN
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#F2EFE9', margin: 0, lineHeight: 1, letterSpacing: '0.02em' }}>
                  {displayProfile.name || 'User'}
                </h1>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FF6A3D', fontSize: '0.78rem', margin: '3px 0 0', fontWeight: 700 }}>
                  @{displayProfile.username || displayProfile.email?.split('@')[0] || 'user'}
                </p>
              </div>

              {isOwnProfile && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={openEditModal}
                    style={{
                      padding: '0.45rem 0.85rem', borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F2EFE9', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={signOut}
                    style={{
                      padding: '0.45rem 0.85rem', borderRadius: 10,
                      background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {displayProfile.bio && (
              <p style={{ color: '#9A9CA3', fontSize: '0.85rem', marginTop: '0.6rem', lineHeight: 1.45, fontFamily: "'Manrope', sans-serif" }}>
                {displayProfile.bio}
              </p>
            )}
          </div>
        </div>

        {/* User Stats Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem', marginTop: '1.25rem',
          paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {[
            { label: 'LOGGED', value: totalMovies, color: '#F2EFE9' },
            { label: 'WATCH TIME', value: `${totalMovies * 2}h`, color: '#F2EFE9' },
            { label: 'TOP GENRE', value: topGenre || '—', color: '#FF6A3D' },
            { label: 'RATING', value: avgRating, color: '#E8B23D', onClick: () => setShowReviews(true) },
          ].map(({ label, value, color, onClick }) => (
            <div
              key={label}
              onClick={onClick}
              style={{
                textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: '#0D0E12',
                border: '1px solid rgba(255,255,255,0.05)', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s'
              }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#9A9CA3', marginTop: 3, fontWeight: 700 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Watch Analytics & Achievements */}
        {Object.keys(genreCounts).length > 0 && (
          <div style={{
            marginTop: '1.25rem', paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem'
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800, color: '#FF6A3D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📊 WATCH ANALYTICS & ACHIEVEMENTS
            </div>

            {/* Genre Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([genreName, count]) => {
                  const percent = Math.round((count / Math.max(genres.length, 1)) * 100)
                  return (
                    <div key={genreName} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#9A9CA3' }}>
                        <span>{genreName}</span>
                        <strong style={{ color: '#F2EFE9' }}>{percent}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #FF7D4D, #FF6A3D)' }} />
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {totalMovies >= 1 && (
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(63,221,168,0.12)', border: '1px solid rgba(63,221,168,0.3)', color: '#3FDDA8', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800 }}>
                  🍿 Cinephile
                </span>
              )}
              {genres.includes('Animation') && (
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,106,61,0.12)', border: '1px solid rgba(255,106,61,0.3)', color: '#FF6A3D', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800 }}>
                  🌸 Otaku Explorer
                </span>
              )}
              {totalMovies >= 5 && (
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(232,178,61,0.12)', border: '1px solid rgba(232,178,61,0.3)', color: '#E8B23D', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800 }}>
                  🏆 Master Critic
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Admin Panel for Admins */}
      {isAdminProfile && <AdminApprovalPanel />}

      {/* Category filter & View toggle bar */}
      {posts && posts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {/* Categories Horizontal Scroll */}
          <div style={{
            display: 'flex', gap: '0.4rem', alignItems: 'center',
            overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: 1, minWidth: 0
          }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: '0.45rem 0.95rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800,
                border: !activeCategory ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0,
                background: !activeCategory ? 'linear-gradient(135deg, #FF7D4D, #FF6A3D)' : '#15171C',
                color: !activeCategory ? '#1a0a04' : '#9A9CA3',
              }}
            >
              ALL ({totalMovies})
            </button>
            {CATEGORIES.filter(cat => posts?.some(p => p.category === cat.id)).map(cat => {
              const count = posts?.filter(p => p.category === cat.id).length
              const active = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(active ? null : cat.id)}
                  style={{
                    padding: '0.45rem 0.95rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800,
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0,
                    background: active ? 'linear-gradient(135deg, #FF7D4D, #FF6A3D)' : '#15171C',
                    color: active ? '#1a0a04' : '#9A9CA3',
                  }}
                >
                  {cat.label.toUpperCase()} ({count})
                </button>
              )
            })}
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: '#15171C', border: '1px solid rgba(255,255,255,0.08)', padding: '3px', borderRadius: 10, flexShrink: 0 }}>
            <button
              onClick={() => setView('grid')}
              style={{
                padding: '5px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: view === 'grid' ? 'rgba(255,106,61,0.2)' : 'transparent',
                color: view === 'grid' ? '#FF6A3D' : '#9A9CA3',
                display: 'flex', alignItems: 'center'
              }}
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setView('feed')}
              style={{
                padding: '5px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: view === 'feed' ? 'rgba(255,106,61,0.2)' : 'transparent',
                color: view === 'feed' ? '#FF6A3D' : '#9A9CA3',
                display: 'flex', alignItems: 'center'
              }}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Posts Section */}
      {postsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : !filteredPosts || filteredPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#15171C', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
          <h3 style={{ color: '#F2EFE9', margin: '0 0 0.5rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}>
            {activeCategory ? 'NO MOVIES IN THIS CATEGORY' : 'NO MOVIES SAVED YET'}
          </h3>
          <p style={{ color: '#9A9CA3', fontSize: '0.85rem', margin: 0 }}>
            {isOwnProfile ? 'Click + Add Movie to share your first pick!' : `${displayProfile.name} hasn't saved any media yet.`}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
          {filteredPosts.map((post, i) => {
            const isAnime = post.genres?.includes('Animation') && post.media_type === 'tv'
            const mediaLabel = isAnime ? 'ANIME' : (post.media_type === 'tv' ? 'TV' : 'MOVIE')

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/media/${post.media_type || 'movie'}/${post.tmdb_id}`}
                  style={{
                    width: '100%', aspectRatio: '2/3', display: 'block', textDecoration: 'none',
                    position: 'relative', borderRadius: 14, overflow: 'hidden',
                    background: '#15171C', border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.04)'
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 106, 61, 0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Image src={getPosterUrl(post.poster_path)} alt={post.title || post.name || 'Poster'}
                    fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 45vw, 150px" />
                  
                  {/* Type badge */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 3,
                    padding: '2px 5px', borderRadius: 4,
                    background: 'rgba(255, 106, 61, 0.2)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 106, 61, 0.4)',
                    color: '#FF6A3D', fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem', fontWeight: 800
                  }}>
                    {mediaLabel}
                  </div>

                  {/* Title scrim */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: 'linear-gradient(to top, rgba(10, 11, 14, 0.95) 0%, transparent 60%)',
                    display: 'flex', alignItems: 'flex-end', padding: '10px'
                  }}>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: 800, color: '#F2EFE9', lineHeight: 1.25,
                      fontFamily: "'Manrope', sans-serif",
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {post.title || post.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map(post => (
            <MovieCard key={post.id} post={{ ...post, profiles: displayProfile }} currentUserId={user?.id} />
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showReviews && <UserReviewsModal profile={displayProfile} onClose={() => setShowReviews(false)} />}
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(10, 11, 14, 0.85)',
              backdropFilter: 'blur(12px)', zIndex: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                width: '100%', maxWidth: 460, background: '#15171C',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20,
                padding: '1.75rem', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                color: '#F2EFE9', position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontFamily: "'Bebas Neue', sans-serif", margin: 0, color: '#F2EFE9', letterSpacing: '0.03em' }}>
                  EDIT PROFILE
                </h3>
                <button
                  onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#9A9CA3',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Avatar section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <Avatar user={{ ...displayProfile, avatar_url: editAvatarUrl }} size={72} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label className="btn-primary" style={{
                      padding: '0.5rem 1rem', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                      {uploadingAvatar ? <LoadingSpinner size="sm" /> : <Upload size={14} />}
                      {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || saving}
                      />
                    </label>
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          padding: '0.5rem 1rem', borderRadius: 12, cursor: 'pointer',
                        }}
                        disabled={uploadingAvatar || saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p style={{ color: '#9A9CA3', fontSize: '0.7rem', marginTop: '0.35rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    JPG, PNG, WebP, or GIF. Max 5 MB.
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                <div>
                  <label htmlFor="modal-display-name" style={{ display: 'block', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#FF6A3D', marginBottom: '0.5rem' }}>
                    DISPLAY NAME
                  </label>
                  <input
                    id="modal-display-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%', background: '#0D0E12', border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12, padding: '0.75rem 1rem', color: '#F2EFE9', fontSize: '0.9rem',
                      fontFamily: "'Manrope', sans-serif", outline: 'none',
                    }}
                    placeholder="Your display name"
                    disabled={uploadingAvatar || saving}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="modal-profile-bio" style={{ display: 'block', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#FF6A3D' }}>
                      BIO
                    </label>
                    <span style={{ fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#9A9CA3' }}>
                      {editBio.length}/200
                    </span>
                  </div>
                  <textarea
                    id="modal-profile-bio"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    style={{
                      width: '100%', background: '#0D0E12', border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12, padding: '0.75rem 1rem', color: '#F2EFE9', fontSize: '0.9rem',
                      fontFamily: "'Manrope', sans-serif", outline: 'none', resize: 'none', minHeight: 80,
                    }}
                    placeholder="Tell your friends about your movie taste..."
                    maxLength={200}
                    disabled={uploadingAvatar || saving}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
                  style={{
                    flex: 1, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12, padding: '0.85rem', color: '#F2EFE9', fontWeight: 700,
                    fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
                  }}
                  disabled={uploadingAvatar || saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-primary"
                  style={{
                    flex: 1, padding: '0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                  disabled={uploadingAvatar || saving}
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
