export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { postId } = await params
    const body = await request.json()
    const { category, personal_note } = body

    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const { data, error } = await supabase
      .from('posts')
      .update({ category, personal_note })
      .eq('id', postId)
      .eq('user_id', user.id)
      .select()
      .single()

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
