'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle, user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/')
    }
  }, [user, authLoading, router])

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
    <main className="login-screen">
      <section className="login-panel glass-panel glass-strong animate-fade-up" aria-labelledby="login-title">
        <Image src="/android-chrome-192x192.png" alt="" width={68} height={68} className="login-logo" />

        <div className="login-copy">
          <p className="page-kicker">WatchNest</p>
          <h1 id="login-title" className="login-title gradient-text">Sign in</h1>
          <p className="page-subtitle">Continue with Google to open your movie circle.</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <button id="google-signin-btn" onClick={handleLogin} disabled={loading} className="login-google">
          {loading ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>
      </section>

      <style>{`
        .login-screen {
          display: grid;
          min-height: 100dvh;
          place-items: center;
          padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
        }

        .login-panel {
          width: min(100%, 430px);
          padding: clamp(1.4rem, 5vw, 2.2rem);
          overflow: hidden;
        }

        .login-logo {
          width: 68px;
          height: 68px;
          border-radius: 20px;
          object-fit: cover;
          box-shadow: 0 18px 40px rgba(34, 211, 238, 0.22);
        }

        .login-copy {
          margin-top: 1.4rem;
          margin-bottom: 1.5rem;
        }

        .login-title {
          margin-top: 0.2rem;
          font-size: clamp(2.2rem, 14vw, 4.4rem);
          font-weight: 820;
          line-height: 0.92;
        }

        .login-error {
          margin-bottom: 1rem;
          padding: 0.8rem 1rem;
          border: 1px solid rgba(251, 113, 133, 0.28);
          border-radius: 14px;
          background: rgba(251, 113, 133, 0.12);
          color: #fecdd3;
          font-size: 0.88rem;
        }

        .login-google {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.72rem;
          width: 100%;
          min-height: 50px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          cursor: pointer;
          font-weight: 850;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.26);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }

        .login-google:hover {
          transform: translateY(-1px);
          box-shadow: 0 24px 52px rgba(0, 0, 0, 0.32);
        }

        .login-google:disabled {
          cursor: wait;
          opacity: 0.68;
        }
      `}</style>
    </main>
  )
}
