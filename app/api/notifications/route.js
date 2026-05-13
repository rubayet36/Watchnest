export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = supabase
      .from('notifications')
      .select(`
        id, type, read, created_at, post_id,
        actor:actor_id(id, name, avatar_url, username),
        post:post_id(id, title, tmdb_id, media_type)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ notifications: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { notification_id, mark_all_read } = await request.json()

    let query = supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
    
    if (!mark_all_read && notification_id) {
      query = query.eq('id', notification_id)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
