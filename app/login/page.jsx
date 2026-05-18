'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/')
    }
  }, [user, authLoading, router])

  function switchMode(next) {
    setMode(next)
    setError(null)
    setSuccessMsg(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name.'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password)
        // onAuthStateChange in AuthContext will pick up the session and the
        // useEffect above will redirect to /
      } else {
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password, name.trim())
        if (needsConfirmation) {
          setSuccessMsg('Check your email for a confirmation link, then sign in.')
          setMode('signin')
        }
        // If email confirmation is disabled in Supabase, onAuthStateChange fires
        // and the user is redirected automatically.
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isSignUp = mode === 'signup'

  return (
    <main className="login-screen">
      <section className="login-panel glass-panel glass-strong animate-fade-up" aria-labelledby="login-title">
        <Image src="/android-chrome-192x192.png" alt="" width={60} height={60} className="login-logo" />

        {/* Mode toggle */}
        <div className="login-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={!isSignUp}
            className={`login-tab ${!isSignUp ? 'is-active' : ''}`}
            onClick={() => switchMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={isSignUp}
            className={`login-tab ${isSignUp ? 'is-active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Create account
          </button>
        </div>

        <h1 id="login-title" className="login-title gradient-text">
          {isSignUp ? 'Join WatchNest' : 'Welcome back'}
        </h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Create an account and start sharing movies.'
            : 'Sign in to open your movie circle.'}
        </p>

        {/* Feedback banners */}
        {error && <div className="login-banner login-banner--error" role="alert">{error}</div>}
        {successMsg && <div className="login-banner login-banner--success" role="status">{successMsg}</div>}

        {/* Email/password form */}
        <form onSubmit={handleEmailSubmit} className="login-form" noValidate>
          {isSignUp && (
            <div className="login-field">
              <User size={15} className="login-field-icon" />
              <input
                id="login-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                disabled={loading}
                className="login-input"
              />
            </div>
          )}

          <div className="login-field">
            <Mail size={15} className="login-field-icon" />
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete={isSignUp ? 'email' : 'username'}
              disabled={loading}
              className="login-input"
            />
          </div>

          <div className="login-field">
            <Lock size={15} className="login-field-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              disabled={loading}
              className="login-input"
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {isSignUp && (
            <div className="login-field">
              <Lock size={15} className="login-field-icon" />
              <input
                id="login-confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="login-input"
              />
            </div>
          )}

          <button
            id="email-submit-btn"
            type="submit"
            disabled={loading}
            className="btn-primary login-submit"
          >
            {loading
              ? <Loader2 size={18} className="spin" />
              : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </section>

      <style>{`
        .login-screen {
          display: grid;
          min-height: 100dvh;
          place-items: center;
          padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
        }

        .login-panel {
          width: min(100%, 420px);
          padding: clamp(1.4rem, 5vw, 2rem);
          overflow: hidden;
        }

        .login-logo {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          object-fit: cover;
          box-shadow: 0 14px 36px rgba(124, 58, 237, 0.35);
          margin-bottom: 1.1rem;
        }

        /* Mode toggle tabs */
        .login-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 1.25rem;
        }

        .login-tab {
          flex: 1;
          padding: 0.45rem 0.75rem;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .login-tab.is-active {
          background: rgba(124, 58, 237, 0.22);
          color: #c4b5fd;
          border: 1px solid rgba(124, 58, 237, 0.35);
        }

        .login-title {
          font-size: clamp(1.7rem, 10vw, 2.6rem);
          font-weight: 860;
          line-height: 1;
          margin: 0 0 0.3rem;
        }

        .login-subtitle {
          color: var(--muted);
          font-size: 0.85rem;
          margin: 0 0 1.2rem;
        }

        /* Banners */
        .login-banner {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .login-banner--error {
          border: 1px solid rgba(251, 113, 133, 0.28);
          background: rgba(251, 113, 133, 0.1);
          color: #fecdd3;
        }
        .login-banner--success {
          border: 1px solid rgba(52, 211, 153, 0.28);
          background: rgba(52, 211, 153, 0.1);
          color: #6ee7b7;
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .login-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-field-icon {
          position: absolute;
          left: 14px;
          color: var(--muted);
          pointer-events: none;
          flex-shrink: 0;
        }

        .login-input {
          width: 100%;
          min-height: 46px;
          padding: 0 42px 0 38px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.18s ease, background 0.18s ease;
        }

        .login-input::placeholder {
          color: var(--muted);
        }

        .login-input:focus {
          border-color: rgba(124, 58, 237, 0.5);
          background: rgba(124, 58, 237, 0.06);
        }

        .login-input:disabled {
          opacity: 0.55;
        }

        .login-eye {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .login-eye:hover {
          color: var(--text);
        }

        .login-submit {
          width: 100%;
          min-height: 48px;
          margin-top: 0.25rem;
          font-size: 0.92rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

      `}</style>
    </main>
  )
}
