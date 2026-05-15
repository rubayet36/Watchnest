'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">
          {isLight ? <Sun size={15} /> : <Moon size={15} />}
        </span>
      </span>
      {!compact && <span>{isLight ? 'Light' : 'Dark'}</span>}

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
          font-weight: 700;
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
          margin-left: ${isLight ? (compact ? '5px' : '11px') : '1px'};
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
