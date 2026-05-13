import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { tmdb_id, title, poster_path, genres, tmdb_rating, release_year, category, personal_note, media_type } = body

    if (!tmdb_id || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate personal note length
    if (personal_note && personal_note.length > 500) {
      return NextResponse.json({ error: 'Note too long (max 500 characters)' }, { status: 400 })
    }

    // Bug #5: Prevent duplicate posts — one post per user per movie
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('tmdb_id', parseInt(tmdb_id))
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You already shared this movie! Edit your existing post instead.', code: 'DUPLICATE' }, { status: 409 })
    }

    // Ensure profile exists
    await supabase.from('profiles').upsert({
      id:         user.id,
      email:      user.email,
      name:       user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      username:   user.email?.split('@')[0] || 'user',
    }, { onConflict: 'id', ignoreDuplicates: true })

    // Insert post
    const { data, error } = await supabase.from('posts').insert({
      user_id:       user.id,
      tmdb_id:       parseInt(tmdb_id),
      title,
      poster_path:   poster_path || null,
      genres:        genres || [],
      tmdb_rating:   tmdb_rating || null,
      release_year:  release_year || null,
      category:      category || 'all-time-fav',
      personal_note: personal_note?.trim() || null,
      media_type:    media_type || 'movie',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
