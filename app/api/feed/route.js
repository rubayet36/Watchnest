import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { searchParams } = new URL(request.url)
    const page        = parseInt(searchParams.get('page') || '0')
    const genreFilter = searchParams.get('genre') || null
    const userFilter  = searchParams.get('user')  || null
    const tmdbFilter  = searchParams.get('tmdb')  || null   // ← new: for movie detail page
    const PAGE_SIZE   = 20
    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('posts')
      .select(`
        id, tmdb_id, title, poster_path, genres, tmdb_rating,
        release_year, category, personal_note, created_at, user_id, media_type,
        profiles:user_id ( id, name, avatar_url, username ),
        reactions ( reaction_type, user_id ),
        saves ( user_id )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (genreFilter) query = query.contains('genres', [genreFilter])
    if (userFilter)  query = query.eq('user_id', userFilter)
    if (tmdbFilter)  query = query.eq('tmdb_id', parseInt(tmdbFilter))

    // Only paginate when not fetching a specific movie
    if (!tmdbFilter) query = query.range(from, to)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // When filtering by tmdb, return all posts as-is (no deduplication)
    if (tmdbFilter) {
      return NextResponse.json({ posts: data || [], nextPage: null })
    }

    // Deduplicate by tmdb_id for the main feed
    const merged = {}
    for (const post of (data || [])) {
      if (!merged[post.tmdb_id]) {
        merged[post.tmdb_id] = { ...post, allNotes: [] }
      }
      if (post.personal_note) {
        merged[post.tmdb_id].allNotes.push({
          note:     post.personal_note,
          user:     post.profiles,
          postedAt: post.created_at,
          postId:   post.id,
        })
      }
      if (new Date(post.created_at) > new Date(merged[post.tmdb_id].created_at)) {
        merged[post.tmdb_id] = { ...merged[post.tmdb_id], ...post, allNotes: merged[post.tmdb_id].allNotes }
      }
    }

    const posts   = Object.values(merged)
    const hasMore = (data || []).length === PAGE_SIZE

    return NextResponse.json(
      { posts, nextPage: hasMore ? page + 1 : null }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
