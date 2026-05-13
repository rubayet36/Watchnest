export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAuth(request) {
  // Try Bearer token first
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return { supabase, user }
  }

  // Fallback: cookie auth
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// POST → ensure profile exists
export async function POST(request) {
  try {
    const { supabase, user } = await getAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const name       = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    const avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
    const username   = user.email?.split('@')[0] || 'user'

    const { data: profile } = await supabase.from('profiles').upsert(
      { id: user.id, email: user.email, name, avatar_url, username },
      { onConflict: 'id' }
    ).select().single()

    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH → update profile fields
export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const updates = body.updates || body  // support both { updates: {...} } and flat body

    // Sanitize — only allow safe fields
    const safe = {}
    if (updates.name !== undefined)   safe.name = String(updates.name).slice(0, 80)
    if (updates.bio !== undefined)    safe.bio  = String(updates.bio).slice(0, 200)

    const { data: profile } = await supabase
      .from('profiles').update(safe).eq('id', user.id).select().single()

    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
