'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/auth-fetch'

const AuthContext = createContext({})
const profileEnsureRequests = new Map()

function normalizeProfile(profile, authUser) {
  if (!profile) return null
  return {
    ...profile,
    email: profile.email || authUser.email,
    account_type: profile.account_type || 'user',
    approved: profile.account_type === 'admin' || Boolean(profile.approved),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const mounted = useRef(true)
  const activeUserId = useRef(null)

  const fetchProfile = useCallback(async (authUser, isNewSignIn = false) => {
    if (!authUser) return null
    activeUserId.current = authUser.id

    const instant = {
      id: authUser.id,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      email: authUser.email,
      username: authUser.email?.split('@')[0] || 'user',
      account_type: 'user',
      approved: false,
    }

    const method = isNewSignIn && !profileEnsureRequests.has(authUser.id) ? 'POST' : 'GET'
    if (method === 'POST') profileEnsureRequests.set(authUser.id, true)

    try {
      const res = await authFetch('/api/profile-ensure', {
        method,
        body: method === 'POST' ? JSON.stringify({ userId: authUser.id }) : undefined,
      })
      const data = res.ok ? await res.json() : null
      if (data?.profile) return { ...instant, ...normalizeProfile(data.profile, authUser) }
    } catch {
      if (method === 'POST') profileEnsureRequests.delete(authUser.id)
    }

    try {
      const supabase = createClient()
      const { data: directProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (directProfile) return { ...instant, ...normalizeProfile(directProfile, authUser) }
    } catch {}

    return instant
  }, [])

  useEffect(() => {
    mounted.current = true
    const supabase = createClient()

    const timeout = setTimeout(() => {
      if (mounted.current) setLoading(false)
    }, 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted.current) return
      if (session?.user) {
        activeUserId.current = session.user.id
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        const authUser = session?.user ?? null
        activeUserId.current = authUser?.id || null
        setUser(authUser)
        if (authUser) {
          const isNewSignIn = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'
          const p = await fetchProfile(authUser, isNewSignIn)
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

  useEffect(() => {
    if (loading || !user || !profile) return
    const isApprovalPath = pathname === '/pending-approval'
    const isPublicPath = isApprovalPath || pathname === '/login' || pathname?.startsWith('/auth')
    const canUseApp = profile.account_type === 'admin' || profile.approved

    if (!canUseApp && !isPublicPath) {
      router.replace('/pending-approval')
    } else if (canUseApp && isApprovalPath) {
      router.replace('/')
    }
  }, [loading, user, profile, pathname, router])

  async function signInWithEmail(email, password) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUpWithEmail(email, password, name) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, name },
      },
    })
    if (error) throw error
    return { needsConfirmation: Boolean(data.user && !data.session) }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    activeUserId.current = null
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
    <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signUpWithEmail, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
