import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Module-level token cache.
 * Edge workers reuse module scope between requests, so this eliminates
 * redundant `supabase.auth.getUser()` network calls for the same token.
 * Each entry expires after CACHE_TTL_MS (60 seconds).
 *
 * @type {Map<string, { user: object, expiresAt: number }>}
 */
const _tokenCache = new Map()
const CACHE_TTL_MS = 60_000 // 60 s — well within a Supabase JWT's lifetime

/** Prune expired entries to avoid unbounded growth. */
function pruneCache() {
  const now = Date.now()
  for (const [key, entry] of _tokenCache) {
    if (entry.expiresAt <= now) _tokenCache.delete(key)
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function getAuthFromCookies() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data } = await withTimeout(supabase.auth.getUser(), 3_000, 'Cookie auth check')
    return { supabase, user: data?.user || null }
  } catch (err) {
    console.warn('[api-auth] cookie auth failed:', err?.message)
    return { supabase: null, user: null }
  }
}

/**
 * Authenticate via Bearer token from Authorization header.
 * Returns { supabase, user } — user is null if unauthenticated or token is invalid.
 *
 * Uses a short-lived module-level cache to avoid a remote Supabase getUser()
 * call on every request (which was causing 10-20 s latency spikes in dev).
 */
export async function getAuthFromHeader(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return getAuthFromCookies()

  // Always build the authed client (cheap — no network).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // --- Cache hit ---
  const cached = _tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return { supabase, user: cached.user }
  }

  // --- Cache miss: verify with Supabase (one network hop) ---
  try {
    const { data, error } = await withTimeout(supabase.auth.getUser(token), 5_000, 'Token auth check')

    if (error || !data?.user) {
      console.warn('[api-auth] getUser failed:', error?.message)
      return getAuthFromCookies()
    }

    // Store in cache; prune stale entries while we're here.
    pruneCache()
    _tokenCache.set(token, { user: data.user, expiresAt: Date.now() + CACHE_TTL_MS })

    return { supabase, user: data.user }
  } catch (err) {
    console.warn('[api-auth] getUser threw:', err?.message)
    return getAuthFromCookies()
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
