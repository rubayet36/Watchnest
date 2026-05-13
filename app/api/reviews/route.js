export const runtime = 'edge'

import { getAuthFromHeader } from '@/lib/api-auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user parameter' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data, error } = await supabase
      .from('user_reviews')
      .select(`
        id, rating, review_text, created_at,
        reviewer:reviewer_id(id, name, avatar_url, username)
      `)
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ reviews: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { reviewee_id, rating, review_text } = body

    if (!reviewee_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    if (user.id === reviewee_id) {
      return NextResponse.json({ error: 'You cannot review yourself' }, { status: 400 })
    }

    const { data, error } = await supabase.from('user_reviews').upsert({
      reviewer_id: user.id,
      reviewee_id,
      rating,
      review_text: review_text?.trim() || null,
    }, { onConflict: 'reviewer_id, reviewee_id' }).select(`
      id, rating, review_text, created_at,
      reviewer:reviewer_id(id, name, avatar_url, username)
    `).single()

    if (error) throw error

    return NextResponse.json({ success: true, review: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
