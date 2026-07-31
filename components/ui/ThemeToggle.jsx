'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, Zap } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted ? theme : 'oled'
  const isLight = currentTheme === 'light'
  const isOled = currentTheme === 'oled'

  const getIcon = () => {
    if (isLight) return <Sun size={15} />
    if (isOled) return <Zap size={15} />
    return <Moon size={15} />
  }

  const getLabel = () => {
    if (isLight) return 'Light'
    if (isOled) return 'OLED'
    return 'Dark'
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      aria-label={`Switch theme (Current: ${getLabel()})`}
      title={`Theme: ${getLabel()} (Click to toggle)`}
      suppressHydrationWarning
    >
      <span className="theme-toggle-track" suppressHydrationWarning>
        <span className="theme-toggle-thumb" suppressHydrationWarning>
          {getIcon()}
        </span>
      </span>
      {!compact && <span suppressHydrationWarning>{getLabel()}</span>}

      <style>{`
        .theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          min-height: 38px;
          border: 1px solid var(--control-border);
          border-radius: 999px;
          background: var(--control-bg);
          color: var(--text);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 750;
          padding: 0.35rem 0.75rem 0.35rem 0.4rem;
          transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
        }

        .theme-toggle:hover {
          border-color: var(--accent-soft);
          transform: translateY(-1px);
        }

        .theme-toggle-compact {
          width: 38px;
          padding: 0;
        }

        .theme-toggle-track {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: ${compact ? '28px' : '34px'};
          height: 24px;
          border-radius: 999px;
          background: var(--toggle-track);
        }

        .theme-toggle-thumb {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          margin-left: ${isLight ? (compact ? '5px' : '11px') : isOled ? '1px' : '6px'};
          border-radius: 999px;
          background: var(--toggle-thumb);
          color: var(--toggle-icon);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          transition: margin 0.18s ease, background 0.18s ease, color 0.18s ease;
        }
      `}</style>
    </button>
  )
}
