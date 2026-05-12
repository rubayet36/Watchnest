import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { userId } = await params

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', userId).single()

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Fetch user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`id, tmdb_id, title, poster_path, genres, tmdb_rating, release_year, category, personal_note, created_at, reactions(reaction_type, user_id), saves(user_id)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 })

    return NextResponse.json({ profile: profile || null, posts: posts || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
