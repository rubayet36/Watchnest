'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Could not sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: '#0a0a14',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '40vw', height: '40vw', maxWidth: 500, maxHeight: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: '35vw', height: '35vw', maxWidth: 400, maxHeight: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(18, 18, 31, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 24,
        padding: '2.5rem 2rem',
        animation: 'fadeUp .5s ease both',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            borderRadius: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: '1rem',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          }}>
            🎬
          </div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #a78bfa, #f43f5e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.2,
          }}>
            WatchNest
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Your circle's movie hub
          </p>
        </div>

        {/* Divider with text */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.375rem' }}>
            Welcome back 👋
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Sign in with Google to join your friend group's movie hub.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.25)',
            borderRadius: 12,
            color: '#fda4af',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          id="google-signin-btn"
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            background: '#fff',
            color: '#1a1a2e',
            fontWeight: 600,
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
            border: 'none',
            borderRadius: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all .2s',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)' }}
        >
          {loading ? (
            <div style={{
              width: 20, height: 20,
              border: '2px solid rgba(26,26,46,0.2)',
              borderTop: '2px solid #1a1a2e',
              borderRadius: '50%',
              animation: 'spin .8s linear infinite',
            }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {/* Features row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.625rem',
          marginTop: '1.5rem',
        }}>
          {[
            ['🎬', 'Share movies'],
            ['👥', 'See friends picks'],
            ['⭐', 'TMDB ratings'],
            ['🔖', 'Your watchlist'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: 'center',
          color: '#334155',
          fontSize: '0.75rem',
          marginTop: '1.5rem',
        }}>
          Invite-only · Ask a friend for the link
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
