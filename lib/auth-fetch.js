import { createClient } from '@/lib/supabase/client'

/**
 * Like fetch() but automatically adds the Supabase Bearer token.
 * Use this for all authenticated API calls instead of plain fetch().
 */
export async function authFetch(url, options = {}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
