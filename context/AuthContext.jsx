'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/auth-fetch'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null
    try {
      const res = await fetch('/api/profile-ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      })
      if (!res.ok) throw new Error('profile fetch failed')
      const { profile } = await res.json()
      return profile
    } catch {
      // Fallback profile from auth metadata
      return {
        id:         authUser.id,
        name:       authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        email:      authUser.email,
        username:   authUser.email?.split('@')[0] || 'user',
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const supabase = createClient()

    // Safety timeout — never block longer than 5s
    const timeout = setTimeout(() => {
      if (mounted.current) setLoading(false)
    }, 5000)

    // 1. Get session (reads localStorage — fast with @supabase/supabase-js)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted.current) return
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user)
        if (mounted.current) setProfile(p)
      }
      clearTimeout(timeout)
      if (mounted.current) setLoading(false)
    }).catch(() => {
      if (mounted.current) setLoading(false)
      clearTimeout(timeout)
    })

    // 2. Listen for auth state changes (sign in after OAuth redirect, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        const authUser = session?.user ?? null
        setUser(authUser)
        if (authUser) {
          const p = await fetchProfile(authUser)
          if (mounted.current) setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted.current = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }

  async function updateProfile(updates) {
    if (!user) return { error: 'Not authenticated' }
    try {
      const res = await authFetch('/api/profile-ensure', {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) return { error: 'Update failed' }
      const { profile: updated } = await res.json()
      if (updated && mounted.current) setProfile(updated)
      return { data: updated }
    } catch (e) {
      return { error: e.message }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
