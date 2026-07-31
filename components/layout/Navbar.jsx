'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Search, Bookmark, User, Plus, LogOut, Tv, History } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import NotificationsDropdown from '@/components/layout/NotificationsDropdown'
import { motion } from 'framer-motion'

/* ── All nav styles self-contained ───────────────────────────── */
const NAV_CSS = `
  @keyframes wn-pulse {
    0%   { transform: scale(.85); opacity: .9; }
    80%  { transform: scale(1.5); opacity: 0; }
    100% { opacity: 0; }
  }

  /* ── Sidebar (desktop ≥1024px) ─────────────── */
  .wn-sidebar {
    display: none;
    position: fixed;
    top: 0; bottom: 0; left: 0;
    z-index: 40;
    width: 264px;
    flex-direction: column;
    padding: 26px 18px;
    background: #0D0E12;
    border-right: 1px solid rgba(255,255,255,0.08);
    overflow-y: auto;
    overflow-x: hidden;
  }
  .wn-sidebar::-webkit-scrollbar { display: none; }

  /* ── Brand ──────────────────────────────────── */
  .wn-brand {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 0 8px 30px; text-decoration: none; color: inherit;
  }
  .wn-logo-mark {
    position: relative; flex-shrink: 0;
    width: 36px; height: 36px; border-radius: 50%;
  }
  .wn-logo-img {
    width: 36px !important; height: 36px !important;
    border-radius: 50%; object-fit: cover;
    box-shadow: 0 0 18px rgba(255,106,61,0.5);
  }
  .wn-logo-ring {
    position: absolute; inset: -5px; border-radius: 50%;
    border: 1px solid rgba(255,106,61,0.4);
    animation: wn-pulse 2.8s ease-out infinite;
    pointer-events: none;
  }
  .wn-wordmark {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px; letter-spacing: 1px; line-height: 1;
  }
  .wn-wordmark-accent { color: #FF6A3D; }
  .wn-tagline {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: #5B5D64;
    margin-top: 4px; line-height: 1.4; max-width: 150px;
  }

  /* ── Nav list ───────────────────────────────── */
  .wn-navlist { display: flex; flex-direction: column; gap: 2px; }
  .wn-nav-link {
    position: relative;
    display: flex; align-items: center; gap: 12px;
    padding: 11px 12px; border-radius: 10px;
    color: #9A9CA3; font-size: 13.5px; font-weight: 600;
    text-decoration: none;
    transition: background .15s, color .15s;
  }
  .wn-nav-link svg { width: 17px; height: 17px; flex-shrink: 0; }
  .wn-nav-link:hover { background: rgba(255,255,255,0.03); color: #F2EFE9; }
  .wn-nav-link.is-active {
    color: #F2EFE9;
    background: linear-gradient(90deg, rgba(255,106,61,0.14), transparent);
  }
  .wn-nav-link.is-active::before {
    content: "";
    position: absolute; left: -18px; top: 8px; bottom: 8px;
    width: 3px; border-radius: 2px;
    background: #FF6A3D;
  }

  /* ── Spacer + Add button ────────────────────── */
  .wn-sidebar-spacer { flex: 1; }
  .wn-add-button {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; height: 44px;
    border-radius: 11px; border: none; cursor: pointer;
    background: linear-gradient(135deg, #FF7D4D, #FF6A3D);
    color: #1a0a04; font-weight: 800; font-size: 13.5px;
    margin: 6px 4px 14px; width: calc(100% - 8px);
    box-shadow: 0 10px 26px -10px rgba(255,106,61,0.6);
    transition: filter .15s;
  }
  .wn-add-button:hover { filter: brightness(1.08); }
  .wn-add-button svg { width: 15px; height: 15px; }

  /* ── History row ────────────────────────────── */
  .wn-history-link {
    display: flex; align-items: center; gap: 10px;
    color: #5B5D64; font-size: 12.5px; font-weight: 600;
    padding: 8px 12px 16px; text-decoration: none;
    transition: color .15s;
  }
  .wn-history-link:hover { color: #9A9CA3; }
  .wn-history-link svg { width: 15px; height: 15px; }

  /* ── User chip ──────────────────────────────── */
  .wn-user-chip {
    display: flex; align-items: center; gap: 10px;
    padding: 10px; border-radius: 12px;
    background: #15171C; border: 1px solid rgba(255,255,255,0.08);
  }
  .wn-user-meta { flex: 1; min-width: 0; }
  .wn-user-name {
    font-size: 12.5px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: #F2EFE9;
  }
  .wn-signout {
    display: flex; align-items: center; gap: 4px;
    margin-top: 2px; border: 0; background: transparent;
    color: #5B5D64; cursor: pointer; font-size: 11px;
    transition: color .15s; padding: 0;
  }
  .wn-signout:hover { color: #FF6A3D; }

  /* ── Mobile Header (< 1024px) ───────────────── */
  .wn-mobile-header {
    display: none;
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    left: 12px; right: 12px;
    z-index: 40;
    align-items: center; justify-content: space-between;
    min-height: 54px; padding: 8px 14px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(13,14,18,0.94);
    backdrop-filter: blur(20px) saturate(1.1);
    -webkit-backdrop-filter: blur(20px) saturate(1.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  .wn-mobile-brand {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none; color: #F2EFE9;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px; letter-spacing: 1px;
  }
  .wn-mobile-logo { width: 28px !important; height: 28px !important; border-radius: 50%; object-fit: cover; }
  .wn-mobile-accent { color: #FF6A3D; }
  .wn-mobile-actions { display: flex; align-items: center; gap: 8px; }
  .wn-mobile-add {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border: none; border-radius: 10px;
    background: linear-gradient(135deg, #FF7D4D, #FF6A3D);
    color: #1a0a04; cursor: pointer;
    box-shadow: 0 6px 16px rgba(255,106,61,0.4);
  }
  .wn-mobile-history {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    background: rgba(255,255,255,0.04); color: #9A9CA3;
    text-decoration: none;
  }

  /* ── Mobile Dock (< 1024px) ─────────────────── */
  .wn-mobile-dock {
    display: none;
    position: fixed;
    bottom: max(12px, env(safe-area-inset-bottom));
    left: 50%; transform: translateX(-50%);
    z-index: 40;
    width: min(calc(100% - 24px), 480px);
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(13,14,18,0.94);
    backdrop-filter: blur(20px) saturate(1.1);
    -webkit-backdrop-filter: blur(20px) saturate(1.1);
    box-shadow: 0 12px 36px rgba(0,0,0,0.6);
    padding: 6px;
  }
  .wn-dock-inner {
    display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 2px;
  }
  .wn-dock-item {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; padding: 7px 0;
    border-radius: 18px; color: #5B5D64;
    text-decoration: none;
    transition: color .15s;
  }
  .wn-dock-item.is-active { color: #F2EFE9; }
  .wn-dock-icon-wrap {
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 42px; height: 28px; border-radius: 14px;
  }
  .wn-dock-active-bg {
    position: absolute; inset: 0; z-index: -1;
    border-radius: 14px;
    background: rgba(255,106,61,0.16);
    border: 1px solid rgba(255,106,61,0.3);
  }
  .wn-dock-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.01em; }

  /* ── Main content offset ────────────────────── */
  @media (min-width: 1024px) {
    .wn-sidebar       { display: flex; }
    .wn-mobile-header,
    .wn-mobile-dock   { display: none !important; }
    .main-content     { margin-left: 264px; }
  }
  @media (max-width: 1023px) {
    .wn-sidebar       { display: none !important; }
    .wn-mobile-header { display: flex; }
    .wn-mobile-dock   { display: block; }
    .main-content {
      padding-top: calc(70px + env(safe-area-inset-top));
      padding-bottom: calc(80px + env(safe-area-inset-bottom));
    }
  }
`

export default function Navbar({ onAddClick }) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const profileHref = user?.id ? `/profile/${user.id}` : '#'

  const navItems = [
    { href: '/feed',      icon: Home,     label: 'Home'      },
    { href: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { href: '/',          icon: Search,   label: 'Search'    },
    { href: '/anime',     icon: Tv,       label: 'Anime'     },
    { href: profileHref,  icon: User,     label: 'Profile'   },
  ]

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    if (href.startsWith('/profile')) return pathname.startsWith('/profile')
    return pathname === href
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* ── Desktop Sidebar ─────────────────────── */}
      <aside className="wn-sidebar">
        {/* Brand */}
        <Link href="/" className="wn-brand" aria-label="WatchNest home">
          <div className="wn-logo-mark">
            <Image
              src="/android-chrome-192x192.png"
              alt="WatchNest logo"
              width={36}
              height={36}
              className="wn-logo-img"
            />
            <div className="wn-logo-ring" />
          </div>
          <div>
            <div className="wn-wordmark">
              WATCH<span className="wn-wordmark-accent">NEST</span>
            </div>
            <div className="wn-tagline">Movie picks with your circle</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="wn-navlist" aria-label="Primary">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={label}
                href={href}
                className={`wn-nav-link ${active ? 'is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="wn-sidebar-spacer" />

        {/* Add button */}
        <button onClick={onAddClick} className="wn-add-button">
          <Plus size={15} />
          Add Movie
        </button>

        {/* History */}
        <Link
          href="/history"
          className={`wn-history-link ${isActive('/history') ? 'is-active' : ''}`}
        >
          <History size={15} />
          History
        </Link>

        {/* User chip */}
        {profile && (
          <div className="wn-user-chip">
            <Avatar user={profile} size={34} />
            <div className="wn-user-meta">
              <div className="wn-user-name">
                {profile.name || profile.email?.split('@')[0] || 'User'}
              </div>
              <button onClick={signOut} className="wn-signout">
                <LogOut size={11} />
                Sign out
              </button>
            </div>
            <NotificationsDropdown />
          </div>
        )}
      </aside>

      {/* ── Mobile Header ───────────────────────── */}
      <header className="wn-mobile-header">
        <Link href="/" className="wn-mobile-brand" aria-label="WatchNest home">
          <Image
            src="/android-chrome-192x192.png"
            alt=""
            width={28}
            height={28}
            className="wn-mobile-logo"
          />
          WATCH<span className="wn-mobile-accent">NEST</span>
        </Link>
        <div className="wn-mobile-actions">
          <button onClick={onAddClick} className="wn-mobile-add" aria-label="Add movie">
            <Plus size={17} />
          </button>
          <Link href="/history" className="wn-mobile-history" aria-label="Watch history">
            <History size={17} />
          </Link>
          {user && <NotificationsDropdown />}
        </div>
      </header>

      {/* ── Mobile Floating Dock ─────────────────── */}
      <nav className="wn-mobile-dock" aria-label="Primary navigation">
        <div className="wn-dock-inner">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={label}
                href={href}
                className={`wn-dock-item ${active ? 'is-active' : ''}`}
              >
                <div className="wn-dock-icon-wrap">
                  <Icon size={19} />
                  {active && (
                    <motion.div
                      layoutId="dock-active"
                      className="wn-dock-active-bg"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  )}
                </div>
                <span className="wn-dock-label">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
