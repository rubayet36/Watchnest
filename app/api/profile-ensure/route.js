export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAuth(request) {
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

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function normalizeProfile(profile, user) {
  if (!profile) return null
  return {
    ...profile,
    email: profile.email || user.email,
    account_type: profile.account_type || 'user',
    approved: profile.account_type === 'admin' || Boolean(profile.approved),
  }
}

export async function GET(request) {
  try {
    const { supabase, user } = await getAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: normalizeProfile(profile, user) })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    const avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
    const username = user.email?.split('@')[0] || 'user'

    const { data: existing } = await supabase
      .from('profiles')
      .select('account_type, approved, approved_at, approved_by')
      .eq('id', user.id)
      .single()

    const { data: profile } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        name,
        avatar_url,
        username,
        account_type: existing?.account_type || 'user',
        approved: Boolean(existing?.approved),
        approved_at: existing?.approved_at || null,
        approved_by: existing?.approved_by || null,
      },
      { onConflict: 'id' }
    ).select().single()

    return NextResponse.json({ profile: normalizeProfile(profile, user) })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const updates = body.updates || body
    const safe = {}
    if (updates.name !== undefined) safe.name = String(updates.name).slice(0, 80)
    if (updates.bio !== undefined) safe.bio = String(updates.bio).slice(0, 200)

    const { data: profile } = await supabase
      .from('profiles')
      .update(safe)
      .eq('id', user.id)
      .select()
      .single()

    return NextResponse.json({ profile: normalizeProfile(profile, user) })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
