'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Search, Bookmark, User, Plus, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import NotificationsDropdown from '@/components/layout/NotificationsDropdown'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Navbar({ onAddClick }) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const profileHref = user?.id ? `/profile/${user.id}` : '#'

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { href: profileHref, icon: User, label: 'Profile' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    if (href.startsWith('/profile')) return pathname.startsWith('/profile')
    return pathname === href
  }

  return (
    <>
      <aside className="wn-sidebar glass glass-strong">
        <Link href="/" className="wn-brand" aria-label="WatchNest home">
          <Image src="/android-chrome-192x192.png" alt="" width={42} height={42} className="wn-brand-mark" />
          <div>
            <div className="wn-brand-name">WatchNest</div>
            <div className="wn-brand-subtitle">Movie picks with your circle</div>
          </div>
        </Link>

        <nav className="wn-nav-list" aria-label="Primary">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={label} href={href} className={`wn-nav-link ${active ? 'is-active' : ''}`}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <button onClick={onAddClick} className="btn-primary wn-add-button">
          <Plus size={18} />
          <span>Add Movie</span>
        </button>

        <div className="wn-theme-row">
          <ThemeToggle />
        </div>

        {profile && (
          <div className="wn-user-card">
            <Avatar user={profile} size={38} />
            <div className="wn-user-meta">
              <div className="wn-user-name">{profile.name || profile.email?.split('@')[0] || 'User'}</div>
              <button onClick={signOut} className="wn-signout">
                <LogOut size={13} />
                Sign out
              </button>
            </div>
            <NotificationsDropdown />
          </div>
        )}
      </aside>

      <header className="wn-mobile-header glass glass-strong">
        <Link href="/" className="wn-mobile-brand" aria-label="WatchNest home">
          <Image src="/android-chrome-192x192.png" alt="" width={34} height={34} className="wn-mobile-logo" />
          <span>WatchNest</span>
        </Link>
        <div className="wn-mobile-actions">
          <button onClick={onAddClick} className="wn-mobile-add" aria-label="Add movie">
            <Plus size={18} />
          </button>
          <ThemeToggle compact />
          {user && <NotificationsDropdown />}
          {user && (
            <Link href={profileHref} aria-label="Profile">
              <Avatar user={profile} size={32} />
            </Link>
          )}
        </div>
      </header>

      <nav className="wn-mobile-nav glass glass-strong" aria-label="Primary">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={label} href={href} className={`wn-mobile-nav-link ${active ? 'is-active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        .wn-sidebar {
          display: none;
          position: fixed;
          top: 16px;
          bottom: 16px;
          left: 16px;
          z-index: 40;
          width: 204px;
          flex-direction: column;
          padding: 14px;
          border-radius: 24px;
        }

        .wn-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          color: inherit;
          text-decoration: none;
        }

        .wn-brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          object-fit: cover;
          box-shadow: 0 12px 30px rgba(34, 211, 238, 0.2);
        }

        .wn-brand-name {
          font-size: 1.05rem;
          font-weight: 900;
          line-height: 1;
          background: linear-gradient(135deg, var(--text), var(--accent) 48%, var(--accent-3));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .wn-brand-subtitle {
          margin-top: 4px;
          max-width: 120px;
          color: var(--muted);
          font-size: 0.68rem;
          line-height: 1.25;
        }

        .wn-nav-list {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 6px;
          margin-top: 20px;
        }

        .wn-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 14px;
          color: var(--muted);
          font-size: 0.9rem;
          font-weight: 750;
          text-decoration: none;
          transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
        }

        .wn-nav-link:hover,
        .wn-nav-link.is-active {
          border-color: rgba(34, 211, 238, 0.22);
          background: rgba(255, 255, 255, 0.09);
          color: var(--text);
          transform: translateX(2px);
        }

        .wn-nav-link.is-active {
          box-shadow: inset 3px 0 0 var(--accent);
        }

        .wn-add-button {
          margin: 12px 0;
        }

        .wn-theme-row {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .wn-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 10px;
          border: 1px solid var(--control-border);
          border-radius: 18px;
          background: var(--control-bg);
        }

        .wn-user-meta {
          flex: 1;
          min-width: 0;
        }

        .wn-user-name {
          overflow: hidden;
          color: var(--text);
          font-size: 0.82rem;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wn-signout {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 3px;
          border: 0;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 0.72rem;
        }

        .wn-signout:hover {
          color: #fb7185;
        }

        .wn-mobile-header {
          position: fixed;
          top: max(10px, env(safe-area-inset-top));
          left: 10px;
          right: 10px;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 54px;
          padding: 8px 10px;
          border-radius: 18px;
        }

        .wn-mobile-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
          font-weight: 900;
          text-decoration: none;
        }

        .wn-mobile-logo {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          object-fit: cover;
        }

        .wn-mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wn-mobile-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1px solid var(--control-border);
          border-radius: 13px;
          background: linear-gradient(135deg, #22d3ee, #8b5cf6 58%, #fb7185);
          color: #fff;
          cursor: pointer;
        }

        .wn-mobile-nav {
          position: fixed;
          right: 10px;
          bottom: max(10px, env(safe-area-inset-bottom));
          left: 10px;
          z-index: 40;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 4px;
          min-height: 64px;
          padding: 8px;
          border-radius: 20px;
        }

        .wn-mobile-nav-link {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 3px;
          border-radius: 14px;
          color: var(--muted);
          font-size: 0.68rem;
          font-weight: 750;
          text-decoration: none;
        }

        .wn-mobile-nav-link.is-active {
          background: rgba(255, 255, 255, 0.11);
          color: var(--accent);
        }

        @media (min-width: 1024px) {
          .wn-sidebar { display: flex; }
          .wn-mobile-header,
          .wn-mobile-nav { display: none; }
        }
      `}</style>
    </>
  )
}
