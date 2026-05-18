export const runtime = 'nodejs'

import { getAuthFromHeader } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)

    if (!user || !supabase) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('saves')
      .select(`
        id, created_at, watched,
        shared_by (id, name, avatar_url),
        posts(id, tmdb_id, title, poster_path, genres, tmdb_rating, release_year, category, personal_note, media_type,
          profiles:user_id(id, name, avatar_url, username))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const movies = (data || []).map(s => ({
      ...s.posts,
      save_id: s.id,
      watched: s.watched || false,
      saved_at: s.created_at,
      shared_by_user: s.shared_by,
    })).filter(Boolean)

    return NextResponse.json({ movies })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
