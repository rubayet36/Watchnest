import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Authenticate via Bearer token from Authorization header.
 * Returns { supabase, user } — user is null if unauthenticated or token is invalid.
 */
export async function getAuthFromHeader(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return { supabase: null, user: null }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // Safely destructure — getUser can return { data: null, error } on failure
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    console.warn('[api-auth] getUser failed:', error?.message)
    return { supabase, user: null }
  }

  return { supabase, user: data.user }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
