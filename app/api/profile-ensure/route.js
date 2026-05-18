export const runtime = 'nodejs'

import { getAuthFromHeader } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

async function getAuth(request) {
  return getAuthFromHeader(request)
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
    const username = user.email?.split('@')[0] || 'user'

    const { data: existing } = await supabase
      .from('profiles')
      .select('avatar_url, account_type, approved, approved_at, approved_by')
      .eq('id', user.id)
      .single()

    const accountAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

    const { data: profile } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        name,
        avatar_url: existing?.avatar_url || accountAvatarUrl,
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
    if (updates.avatar_url !== undefined) {
      const avatarUrl = updates.avatar_url ? String(updates.avatar_url).slice(0, 500) : null
      if (
        avatarUrl === null ||
        avatarUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-avatars/`) ||
        avatarUrl.startsWith('https://lh3.googleusercontent.com/')
      ) {
        safe.avatar_url = avatarUrl
      }
    }

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
