'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfile, useUserPosts } from '@/hooks/useProfile'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'
import Link from 'next/link'
import { getPosterUrl } from '@/lib/tmdb'
import { getCategoryById, CATEGORIES, timeAgo } from '@/lib/utils'
import { CardSkeleton, EmptyState } from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import MovieCard from '@/components/feed/MovieCard'
import { Film, Star, Calendar, Grid, List, MessageSquareHeart, Camera, Upload, Trash2, Save, X, LogOut } from 'lucide-react'
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

  // Use the live auth profile for own-account admin/approval fields; the profile
  // query can be briefly stale after changing account_type in Supabase.
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
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>This user doesn&apos;t exist or hasn&apos;t set up their profile yet.</p>
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={openEditModal}
                    style={{
                      padding: '0.375rem 0.875rem', borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', fontSize: '0.8125rem', cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    Edit
                  </button>
                  <button
                    onClick={signOut}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '0.375rem 0.875rem', borderRadius: 10,
                      background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                      color: '#fb7185', fontSize: '0.8125rem', cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244,63,94,0.18)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
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
            { icon: '💖', value: avgRating, label: 'User Rating', onClick: () => setShowReviews(true) },
            { icon: '📅', value: displayProfile.created_at ? new Date(displayProfile.created_at).getFullYear() : '—', label: 'Joined' },
          ].map(({ icon, value, label, onClick }) => (
            <div key={label} onClick={onClick} style={{ textAlign: 'center', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }}
              onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}
            >
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

      {isAdminProfile && <AdminApprovalPanel />}

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
          {filteredPosts.map((post, i) => {
            const isAnime = post.genres?.includes('Animation') && post.media_type === 'tv'
            const mediaLabel = isAnime ? 'ANIME' : (post.media_type === 'tv' ? 'TV' : '')
            const mediaColor = isAnime ? '#ec4899' : (post.media_type === 'tv' ? '#3b82f6' : '#10b981')

            return (
            <motion.div key={post.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              style={{ minWidth: 0 }}
            >
              <Link href={`/media/${post.media_type || 'movie'}/${post.tmdb_id}`} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', background: '#1c1c2e' }}
                  className="poster-hover">
                  <Image src={getPosterUrl(post.poster_path)} alt={post.title || post.name || 'Poster'}
                    fill style={{ objectFit: 'cover' }} sizes="33vw" />
                  {mediaLabel && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: `rgba(0,0,0,0.6)`, backdropFilter: 'blur(4px)', padding: '2px 5px', borderRadius: 4, fontSize: '0.55rem', fontWeight: 800, color: mediaColor, border: `1px solid ${mediaColor}55` }}>
                      {mediaLabel}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.title}
                </p>
              </Link>
            </motion.div>
          )})}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map(post => (
            <MovieCard key={post.id} post={{ ...post, profiles: displayProfile }} currentUserId={user?.id} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showReviews && <UserReviewsModal profile={displayProfile} onClose={() => setShowReviews(false)} />}
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(9, 9, 11, 0.8)',
              backdropFilter: 'blur(12px)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'rgba(20, 20, 35, 0.9)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: 24,
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
                color: '#e2e8f0',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Edit Profile
                </h3>
                <button
                  onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Avatar section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <Avatar user={{ ...displayProfile, avatar_url: editAvatarUrl }} size={72} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(124, 58, 237, 0.15)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      color: '#a78bfa',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.5rem 1rem',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(244, 63, 94, 0.08)',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          color: '#fb7185',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.5rem 1rem',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        disabled={uploadingAvatar || saving}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.35rem' }}>
                    JPG, PNG, WebP, or GIF. Max 5 MB.
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                <div>
                  <label htmlFor="modal-display-name" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Display Name
                  </label>
                  <input
                    id="modal-display-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      padding: '0.75rem 1rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    placeholder="Your display name"
                    disabled={uploadingAvatar || saving}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="modal-profile-bio" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                      Bio
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {editBio.length}/200
                    </span>
                  </div>
                  <textarea
                    id="modal-profile-bio"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      padding: '0.75rem 1rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'none',
                      minHeight: 80,
                      transition: 'all 0.2s',
                    }}
                    placeholder="Tell your friends about your movie taste..."
                    maxLength={200}
                    disabled={uploadingAvatar || saving}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => !uploadingAvatar && !saving && setShowEditProfile(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 14,
                    padding: '0.875rem',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  disabled={uploadingAvatar || saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    border: 'none',
                    borderRadius: 14,
                    padding: '0.875rem',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                  }}
                  disabled={uploadingAvatar || saving}
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />}
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
