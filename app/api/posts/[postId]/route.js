export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

const FEATURE_COLUMNS = ['contains_spoilers', 'mood_tags', 'user_rating', 'why_watch']

function featureColumnMissing(error) {
  const message = error?.message || ''
  return FEATURE_COLUMNS.some((column) => message.includes(column))
}

export async function PATCH(request, { params }) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { postId } = await params
    const body = await request.json()
    const {
      category,
      personal_note,
      review,
      contains_spoilers,
      mood_tags,
      user_rating,
      why_watch,
    } = body

    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const parsedUserRating = user_rating === null || user_rating === undefined || user_rating === ''
      ? null
      : Number(user_rating)

    if (parsedUserRating !== null && (!Number.isFinite(parsedUserRating) || parsedUserRating < 0 || parsedUserRating > 10)) {
      return NextResponse.json({ error: 'Rating must be between 0 and 10' }, { status: 400 })
    }

    const updatePayload = {
      category,
      personal_note: personal_note ?? review ?? null,
      contains_spoilers: Boolean(contains_spoilers),
      mood_tags: Array.isArray(mood_tags) ? mood_tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6) : [],
      user_rating: parsedUserRating,
      why_watch: why_watch?.trim() || null,
    }

    let { data, error } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error && featureColumnMissing(error)) {
      const legacyPayload = { ...updatePayload }
      for (const column of FEATURE_COLUMNS) delete legacyPayload[column]
      ;({ data, error } = await supabase
        .from('posts')
        .update(legacyPayload)
        .eq('id', postId)
        .eq('user_id', user.id)
        .select()
        .single())
    }

    if (error) throw error

    return NextResponse.json({ success: true, post: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { postId } = await params
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
