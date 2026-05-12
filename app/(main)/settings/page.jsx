'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

const inp = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.9375rem',
  color: '#e2e8f0', fontFamily: 'inherit', outline: 'none', transition: 'border .15s',
}

export default function SettingsPage() {
  const { user, profile, updateProfile, loading, signOut } = useAuth()
  const [name, setName]   = useState('')
  const [bio, setBio]     = useState('')
  const [saving, setSaving] = useState(false)

  // Sync form with profile once loaded
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setBio(profile.bio || '')
    }
  }, [profile])

  async function handleSave() {
    setSaving(true)
    const { error } = await updateProfile({ name: name.trim(), bio: bio.trim() })
    setSaving(false)
    if (error) toast.error('Failed to save changes')
    else toast.success('Profile updated! ✨')
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(135deg,#a78bfa,#f43f5e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
        Settings
      </h1>

      <div style={{ background:'rgba(28,28,46,0.7)', backdropFilter:'blur(20px)', border:'1px solid rgba(139,92,246,0.12)', borderRadius:24, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Avatar row */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          {loading ? (
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
          ) : (
            <Avatar user={profile} size={64} />
          )}
          <div>
            <p style={{ margin:0, fontWeight:600, color:'#e2e8f0', fontSize:'0.9375rem' }}>{profile?.email || user?.email}</p>
            <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#475569' }}>Avatar synced from Google</p>
          </div>
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }} />

        {/* Name */}
        <div>
          <label style={{ display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#94a3b8', marginBottom:'0.5rem' }}>Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            style={inp}
            onFocus={e  => e.target.style.borderColor = '#8b5cf6'}
            onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Bio */}
        <div>
          <label style={{ display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#94a3b8', marginBottom:'0.5rem' }}>
            Bio <span style={{ color:'#475569', fontWeight:400 }}>(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell your friends about your movie taste…"
            rows={3}
            maxLength={200}
            style={{ ...inp, resize:'none', lineHeight:1.6 }}
            onFocus={e => e.target.style.borderColor = '#8b5cf6'}
            onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'#475569', textAlign:'right' }}>{bio.length}/200</p>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} style={{
          width:'100%', padding:'0.875rem', borderRadius:14,
          background: saving ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
          border:'none', cursor: saving ? 'not-allowed' : 'pointer',
          color:'white', fontWeight:700, fontSize:'0.9375rem', fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem',
          transition:'opacity .2s', boxShadow:'0 4px 20px rgba(124,58,237,0.3)',
        }}>
          {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }} />

        {/* Sign out */}
        <button onClick={signOut} style={{
          width:'100%', padding:'0.875rem', borderRadius:14,
          background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)',
          cursor:'pointer', color:'#f87171', fontWeight:600, fontSize:'0.9375rem',
          fontFamily:'inherit', transition:'all .15s',
        }}
          onMouseEnter={e => e.target.style.background = 'rgba(244,63,94,0.15)'}
          onMouseLeave={e => e.target.style.background = 'rgba(244,63,94,0.08)'}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
