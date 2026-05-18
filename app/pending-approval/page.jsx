'use client'

import { Clock, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function PendingApprovalPage() {
  const { profile, signOut } = useAuth()

  return (
    <main className="approval-screen">
      <section className="approval-card glass-panel glass-strong">
        <div className="approval-icon">
          <Clock size={30} />
        </div>
        <p className="page-kicker">Account pending</p>
        <h1 className="page-title gradient-text">Waiting for approval</h1>
        <p className="page-subtitle">
          Your WatchNest account is created, but an admin needs to approve it before you can use the app.
        </p>

        <div className="approval-meta">
          <ShieldCheck size={16} />
          <span>{profile?.email || profile?.username || 'Signed-in account'}</span>
        </div>

        <button type="button" className="approval-signout" onClick={signOut}>
          <LogOut size={15} /> Sign out
        </button>
      </section>

      <style>{`
        .approval-screen {
          display: grid;
          min-height: 100dvh;
          place-items: center;
          padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
        }
        .approval-card {
          width: min(100%, 440px);
          padding: clamp(1.35rem, 5vw, 2rem);
          text-align: center;
        }
        .approval-icon {
          display: inline-grid;
          place-items: center;
          width: 62px;
          height: 62px;
          margin-bottom: 1rem;
          border: 1px solid rgba(34, 211, 238, 0.24);
          border-radius: 20px;
          background: rgba(34, 211, 238, 0.1);
          color: var(--accent);
        }
        .approval-meta {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-top: 1rem;
          padding: 0.58rem 0.76rem;
          border: 1px solid var(--control-border);
          border-radius: 999px;
          background: var(--control-bg);
          color: var(--text-soft);
          font-size: 0.84rem;
          font-weight: 800;
        }
        .approval-signout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-height: 42px;
          margin-top: 1rem;
          border: 1px solid var(--control-border);
          border-radius: 999px;
          background: var(--surface-row-bg);
          color: var(--text);
          cursor: pointer;
          padding: 0 0.9rem;
          font-weight: 850;
        }
      `}</style>
    </main>
  )
}
