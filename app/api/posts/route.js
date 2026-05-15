export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

const FEATURE_COLUMNS = ['contains_spoilers', 'mood_tags', 'user_rating', 'why_watch']

function featureColumnMissing(error) {
  const message = error?.message || ''
  return FEATURE_COLUMNS.some((column) => message.includes(column))
}

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
      category,
      personal_note,
      media_type,
      contains_spoilers,
      mood_tags,
      user_rating,
      why_watch,
    } = body

    if (!tmdb_id || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (personal_note && personal_note.length > 500) {
      return NextResponse.json({ error: 'Note too long (max 500 characters)' }, { status: 400 })
    }

    if (why_watch && why_watch.length > 280) {
      return NextResponse.json({ error: 'Why-watch prompt too long (max 280 characters)' }, { status: 400 })
    }

    const safeMediaType = media_type || 'movie'
    const safeMoodTags = Array.isArray(mood_tags)
      ? mood_tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
      : []
    const parsedUserRating = user_rating === null || user_rating === undefined || user_rating === ''
      ? null
      : Number(user_rating)

    if (parsedUserRating !== null && (!Number.isFinite(parsedUserRating) || parsedUserRating < 0 || parsedUserRating > 10)) {
      return NextResponse.json({ error: 'Rating must be between 0 and 10' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('tmdb_id', parseInt(tmdb_id))
      .eq('media_type', safeMediaType)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already shared this title. Edit your existing post instead.', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      username: user.email?.split('@')[0] || 'user',
    }, { onConflict: 'id', ignoreDuplicates: true })

    const insertPayload = {
      user_id: user.id,
      tmdb_id: parseInt(tmdb_id),
      title,
      poster_path: poster_path || null,
      genres: genres || [],
      tmdb_rating: tmdb_rating || null,
      release_year: release_year || null,
      category: category || 'all-time-fav',
      personal_note: personal_note?.trim() || null,
      media_type: safeMediaType,
      contains_spoilers: Boolean(contains_spoilers),
      mood_tags: safeMoodTags,
      user_rating: parsedUserRating,
      why_watch: why_watch?.trim() || null,
    }

    let { data, error } = await supabase.from('posts').insert(insertPayload).select().single()

    if (error && featureColumnMissing(error)) {
      const legacyPayload = { ...insertPayload }
      for (const column of FEATURE_COLUMNS) delete legacyPayload[column]
      ;({ data, error } = await supabase.from('posts').insert(legacyPayload).select().single())
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
