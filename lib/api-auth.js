import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Authenticate via Bearer token from Authorization header.
 * Returns { supabase, user } or throws.
 */
export async function getAuthFromHeader(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return { supabase: null, user: null }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  return { supabase, user }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
