export const runtime = 'edge'

import { getAuthFromHeader } from '@/lib/api-auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    let supabase, user

    // Try token auth first (from Authorization header)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (token) {
      const { createClient } = await import('@supabase/supabase-js')
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const res = await supabase.auth.getUser(token)
      user = res?.data?.user
    }

    // Fallback to cookie auth
    if (!user) {
      const cookieStore = await cookies()
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      )
      const res = await supabase.auth.getUser()
      user = res?.data?.user
    }

    if (!user) return NextResponse.json({ movies: [] })

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
