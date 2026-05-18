'use client'
import { useState } from 'react'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

export default function Avatar({ user, size = 40 }) {
  const avatarUrl = user?.avatar_url || ''
  const [failedSrc, setFailedSrc] = useState('')
  const initials = getInitials(user?.name || user?.email || '?')
  const fontSize = size < 32 ? 10 : size < 48 ? 12 : size < 64 ? 14 : 16

  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    outline: '2px solid rgba(139,92,246,0.3)', outlineOffset: 1,
    position: 'relative', overflow: 'hidden',
  }

  if (avatarUrl && failedSrc !== avatarUrl) {
    return (
      <div style={base}>
        <Image
          src={avatarUrl} alt={user.name || 'User'}
          fill sizes={`${size}px`} style={{ objectFit: 'cover' }}
          unoptimized
          onError={() => setFailedSrc(avatarUrl)}
        />
      </div>
    )
  }

  return (
    <div style={{
      ...base,
      background: 'linear-gradient(135deg, #7c3aed, #f43f5e)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize, color: 'white', letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}
