export const runtime = 'nodejs'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const {
      tmdb_id,
      title,
      poster_path,
      genres,
      tmdb_rating,
      release_year,
      media_type,
    } = body

    if (!tmdb_id || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const safeMediaType = media_type || 'movie'
    const parsedTmdbId = parseInt(tmdb_id)

    // 1. Ensure user profile exists
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      username: user.email?.split('@')[0] || 'user',
    }, { onConflict: 'id', ignoreDuplicates: true })

    // 2. Check if a post already exists for this user and movie
    const { data: existingPosts, error: selectError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('tmdb_id', parsedTmdbId)
      .eq('media_type', safeMediaType)
      .limit(1)

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    let post_id = existingPosts?.[0]?.id

    if (!post_id) {
      // Create new post under 'must-watch' category with special personal_note to hide it from feeds
      const insertPayload = {
        user_id: user.id,
        tmdb_id: parsedTmdbId,
        title,
        poster_path: poster_path || null,
        genres: genres || [],
        tmdb_rating: tmdb_rating || null,
        release_year: release_year || null,
        category: 'must-watch',
        personal_note: '__system_watchlist_only__', // special key to hide it from feeds/profiles
        media_type: safeMediaType,
      }

      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert(insertPayload)
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      post_id = newPost.id
    }

    // 3. Toggle the save entry
    const { data: existingSaves, error: savesError } = await supabase
      .from('saves')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .limit(1)

    if (savesError) {
      return NextResponse.json({ error: savesError.message }, { status: 500 })
    }

    const existingSave = existingSaves?.[0]

    if (existingSave) {
      const { error: deleteError } = await supabase
        .from('saves')
        .delete()
        .eq('id', existingSave.id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, saved: false })
    } else {
      const { error: saveError } = await supabase
        .from('saves')
        .insert({ post_id, user_id: user.id })

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, saved: true })
    }

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
