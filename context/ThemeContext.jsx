'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({
  theme: 'oled',
  accent: 'cyan',
  setTheme: () => {},
  setAccent: () => {},
  toggleTheme: () => {},
})

const STORAGE_KEY = 'watchnest-theme'
const ACCENT_KEY = 'watchnest-accent'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'oled'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'oled') return saved
  return 'oled'
}

function getInitialAccent() {
  if (typeof window === 'undefined') return 'cyan'
  const saved = window.localStorage.getItem(ACCENT_KEY)
  if (['cyan', 'violet', 'rose', 'emerald', 'gold'].includes(saved)) return saved
  return 'cyan'
}

function applyTheme(theme, accent) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.accent = accent
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark'

  let metaTheme = document.querySelector('meta[name="theme-color"]')
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.setAttribute('name', 'theme-color')
    document.head.appendChild(metaTheme)
  }
  metaTheme.setAttribute(
    'content',
    theme === 'light' ? '#f8fafc' : theme === 'oled' ? '#000000' : '#070914'
  )
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)
  const [accent, setAccentState] = useState(getInitialAccent)

  useEffect(() => {
    applyTheme(theme, accent)
    window.localStorage.setItem(STORAGE_KEY, theme)
    window.localStorage.setItem(ACCENT_KEY, accent)
  }, [theme, accent])

  const value = useMemo(() => ({
    theme,
    accent,
    setTheme: (nextTheme) => setThemeState(nextTheme),
    setAccent: (nextAccent) => setAccentState(nextAccent),
    toggleTheme: () => setThemeState((current) => {
      if (current === 'oled') return 'dark'
      if (current === 'dark') return 'light'
      return 'oled'
    }),
  }), [theme, accent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

