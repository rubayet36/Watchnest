import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('q') || ''
    if (term.length < 2) return NextResponse.json({ results: [] })

    const { data } = await supabase
      .from('posts')
      .select('tmdb_id, title, poster_path, tmdb_rating, release_year, genres, profiles:user_id(id, name, avatar_url)')
      .ilike('title', `%${term}%`)
      .limit(20)

    // Deduplicate by tmdb_id
    const seen = new Set()
    const results = (data || []).filter(p => {
      if (seen.has(p.tmdb_id)) return false
      seen.add(p.tmdb_id); return true
    })

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ results: [], error: e.message })
  }
}
