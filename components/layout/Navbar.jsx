'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bookmark, User, Plus, Film } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import NotificationsDropdown from '@/components/layout/NotificationsDropdown'

export default function Navbar({ onAddClick }) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const profileHref = user?.id ? `/profile/${user.id}` : '#'

  const navItems = [
    { href: '/',          icon: Home,     label: 'Home'      },
    { href: '/search',    icon: Search,   label: 'Search'    },
    { href: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { href: profileHref,  icon: User,     label: 'My Profile'},
  ]

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    if (href.startsWith('/profile')) return pathname.startsWith('/profile')
    return pathname === href
  }

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────── */}
      <aside style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, height: '100%', width: 220,
        background: 'rgba(12,12,24,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(139,92,246,0.12)',
        flexDirection: 'column',
        padding: '1.25rem 0.75rem',
        zIndex: 40,
      }}
        className="desktop-sidebar"
      >
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.5rem 0.75rem', marginBottom: '1.5rem',
          textDecoration: 'none', borderRadius: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
          }}>🎬</div>
          <div>
            <div style={{
              fontWeight: 900, fontSize: '1.0625rem', lineHeight: 1.1,
              background: 'linear-gradient(135deg, #a78bfa, #f43f5e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>WatchNest</div>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 1 }}>
              Your circle's movie hub
            </div>
            <div style={{ fontSize: '0.6rem', color: '#6d5b9a', marginTop: 2, fontStyle: 'italic', letterSpacing: '0.02em' }}>
              ✦ Created by Rubayet Khan
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={label} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: 12,
                textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
                transition: 'all .15s',
                background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: active ? '#a78bfa' : '#64748b',
                border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
              }}>
                <Icon size={18} />
                {label}
                {active && (
                  <div style={{
                    marginLeft: 'auto', width: 6, height: 6,
                    borderRadius: '50%', background: '#a78bfa',
                  }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Add Movie */}
        <button onClick={onAddClick} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', padding: '0.75rem',
          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
          fontFamily: 'inherit', marginBottom: '1rem',
          boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          transition: 'opacity .2s, transform .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={18} /> Add Movie
        </button>

        {/* User row */}
        {profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Avatar user={profile} size={34} />
            <NotificationsDropdown />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.name || profile.email?.split('@')[0] || 'User'}
              </div>
              <button onClick={signOut} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569', fontSize: '0.7rem', padding: 0, fontFamily: 'inherit',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile Top Bar ─────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(12,12,24,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139,92,246,0.12)',
        padding: '0.625rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🎬</div>
          <div>
            <span style={{
              fontWeight: 900, fontSize: '1.125rem',
              background: 'linear-gradient(135deg, #a78bfa, #f43f5e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', display: 'block', lineHeight: 1.1,
            }}>WatchNest</span>
            <span style={{ fontSize: '0.55rem', color: '#6d5b9a', fontStyle: 'italic', display: 'block', lineHeight: 1 }}>
              ✦ Created by Rubayet Khan
            </span>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onAddClick} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0.375rem 0.75rem',
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            color: 'white', fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'inherit',
          }}>
            <Plus size={14} /> Add
          </button>
          {user && <NotificationsDropdown />}
          {user && (
            <Link href={profileHref}>
              <Avatar user={profile} size={30} />
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Nav ──────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(12,12,24,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(139,92,246,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0.5rem 0.25rem',
      }} className="mobile-nav">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={label} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '0.375rem 0.75rem', borderRadius: 10,
              textDecoration: 'none', fontSize: '0.65rem', fontWeight: 500,
              color: active ? '#a78bfa' : '#475569',
              transition: 'color .15s',
            }}>
              <Icon size={20} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Responsive CSS ─────────────────────────────── */}
      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-header   { display: none !important; }
          .mobile-nav      { display: none !important; }
        }
      `}</style>
    </>
  )
}
