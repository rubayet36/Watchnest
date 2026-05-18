import { createClient } from '@/lib/supabase/client'

/**
 * Like fetch() but automatically adds the Supabase Bearer token.
 * Use this for all authenticated API calls instead of plain fetch().
 */
export async function authFetch(url, options = {}) {
  const supabase = createClient()
  const timeoutMs = options.timeoutMs || 8_000
  let sessionTimer
  const sessionTimeout = new Promise((_, reject) => {
    sessionTimer = window.setTimeout(() => reject(new Error('Session lookup timed out')), timeoutMs)
  })

  const { data } = await Promise.race([
    supabase.auth.getSession(),
    sessionTimeout,
  ]).finally(() => window.clearTimeout(sessionTimer))

  const token = data?.session?.access_token || ''
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options

  return fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
