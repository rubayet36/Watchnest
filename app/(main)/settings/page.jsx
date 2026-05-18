'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, Moon, Save, Sun, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import Avatar from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import PushNotificationControl from '@/components/pwa/PushNotificationControl'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { user, profile, updateProfile, loading, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    const timer = window.setTimeout(() => {
      setName(profile.name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile])

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

      setAvatarUrl(nextAvatarUrl)
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
    setAvatarUrl('')
    toast.success('Profile picture removed')
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await updateProfile({ name: name.trim(), bio: bio.trim(), avatar_url: avatarUrl || null })
    setSaving(false)
    if (error) toast.error('Failed to save changes')
    else toast.success('Profile updated')
  }

  return (
    <div className="page-shell mobile-safe-bottom">
      <header className="page-header">
        <div>
          <p className="page-kicker">Preferences</p>
          <h1 className="page-title gradient-text">Settings</h1>
          <p className="page-subtitle">Tune your profile and app appearance.</p>
        </div>
      </header>

      <section className="settings-panel glass-panel glass-strong">
        <div className="settings-profile">
          {loading ? (
            <div className="settings-avatar-placeholder" />
          ) : (
            <Avatar user={{ ...profile, avatar_url: avatarUrl }} size={64} />
          )}
          <div>
            <p className="settings-email">{profile?.email || user?.email}</p>
            <p className="settings-muted">{avatarUrl ? 'Custom profile picture enabled' : 'Add a profile picture'}</p>
          </div>
        </div>

        <div className="settings-avatar-card">
          <div className="settings-avatar-copy">
            <Camera size={17} />
            <div>
              <strong>Profile picture</strong>
              <p>JPG, PNG, WebP, or GIF. Max 5 MB.</p>
            </div>
          </div>
          <div className="settings-avatar-actions">
            <label className="settings-avatar-upload">
              {uploadingAvatar ? <LoadingSpinner size="sm" /> : <Upload size={15} />}
              {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar || saving}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="settings-avatar-remove"
                disabled={uploadingAvatar || saving}
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="settings-divider" />

        <div>
          <label className="settings-label">Appearance</label>
          <div className="theme-segment" role="group" aria-label="Choose color theme">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={theme === 'dark' ? 'is-active' : ''}
            >
              <Moon size={16} />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={theme === 'light' ? 'is-active' : ''}
            >
              <Sun size={16} />
              White
            </button>
          </div>
          <Link href="/shader" className="settings-inline-link">Open shader preview</Link>
        </div>

        <PushNotificationControl />

        <div>
          <label className="settings-label" htmlFor="display-name">Display Name</label>
          <input
            id="display-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="settings-label" htmlFor="profile-bio">
            Bio <span>(optional)</span>
          </label>
          <textarea
            id="profile-bio"
            className="input settings-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your friends about your movie taste..."
            rows={3}
            maxLength={200}
          />
          <p className="settings-count">{bio.length}/200</p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <div className="settings-divider" />

        <button onClick={signOut} className="settings-signout">
          Sign Out
        </button>
      </section>

      <style>{`
        .settings-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: clamp(1.1rem, 4vw, 1.5rem);
        }

        .settings-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }

        .settings-avatar-placeholder {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--control-bg);
        }

        .settings-email {
          margin: 0;
          color: var(--text);
          font-size: 0.95rem;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .settings-muted {
          margin: 0.2rem 0 0;
          color: var(--muted);
          font-size: 0.78rem;
        }

        .settings-avatar-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem;
          border: 1px solid var(--control-border);
          border-radius: 18px;
          background: var(--surface-row-bg);
        }

        .settings-avatar-copy {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .settings-avatar-copy svg {
          color: var(--accent);
          flex-shrink: 0;
        }

        .settings-avatar-copy strong {
          display: block;
          color: var(--text);
          font-size: 0.9rem;
        }

        .settings-avatar-copy p {
          margin: 0.18rem 0 0;
          color: var(--muted);
          font-size: 0.76rem;
          line-height: 1.35;
        }

        .settings-avatar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .settings-avatar-upload,
        .settings-avatar-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          min-height: 36px;
          padding: 0 0.85rem;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 800;
        }

        .settings-avatar-upload {
          border: 1px solid var(--accent-soft);
          background: var(--control-bg);
          color: var(--text);
        }

        .settings-avatar-upload input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .settings-avatar-remove {
          border: 1px solid rgba(244, 63, 94, 0.26);
          background: rgba(244, 63, 94, 0.08);
          color: #fb7185;
        }

        .settings-avatar-upload:has(input:disabled),
        .settings-avatar-remove:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .settings-divider {
          height: 1px;
          background: var(--control-border);
        }

        .push-control {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem;
          border: 1px solid var(--control-border);
          border-radius: 16px;
          background: var(--surface-row-bg);
        }

        .push-control svg {
          color: var(--accent);
        }

        .push-control strong {
          display: block;
          color: var(--text);
          font-size: 0.9rem;
        }

        .push-control p {
          margin: 0.18rem 0 0;
          color: var(--muted);
          font-size: 0.76rem;
          line-height: 1.35;
        }

        .push-control-warning {
          color: #f43f5e !important;
        }

        .push-control button {
          min-height: 34px;
          padding: 0 0.8rem;
          border: 1px solid var(--accent-soft);
          border-radius: 999px;
          background: var(--control-bg);
          color: var(--text);
          cursor: pointer;
          font-weight: 750;
        }

        .push-control button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .settings-avatar-card {
            align-items: stretch;
            flex-direction: column;
          }

          .settings-avatar-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .push-control {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .push-control button {
            grid-column: 1 / -1;
            width: 100%;
          }
        }

        .settings-label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--text-soft);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .settings-label span,
        .settings-count {
          color: var(--muted);
          font-weight: 500;
        }

        .settings-inline-link {
          display: inline-flex;
          margin-top: 0.55rem;
          color: var(--accent);
          font-size: 0.8rem;
          font-weight: 800;
          text-decoration: none;
        }

        .settings-textarea {
          resize: none;
          line-height: 1.55;
        }

        .settings-count {
          margin: 0.35rem 0 0;
          font-size: 0.75rem;
          text-align: right;
        }

        .theme-segment {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.45rem;
          padding: 0.35rem;
          border: 1px solid var(--control-border);
          border-radius: 16px;
          background: var(--control-bg);
        }

        .theme-segment button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-height: 42px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-weight: 750;
          transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
        }

        .theme-segment button.is-active {
          border-color: var(--accent-soft);
          background: var(--surface-row-hover);
          color: var(--text);
        }

        .settings-signout {
          width: 100%;
          min-height: 46px;
          border: 1px solid rgba(244, 63, 94, 0.28);
          border-radius: 14px;
          background: rgba(244, 63, 94, 0.08);
          color: #e11d48;
          cursor: pointer;
          font-size: 0.94rem;
          font-weight: 750;
          transition: background 0.16s ease, border-color 0.16s ease;
        }

        .settings-signout:hover {
          border-color: rgba(244, 63, 94, 0.42);
          background: rgba(244, 63, 94, 0.13);
        }
      `}</style>
    </div>
  )
}
