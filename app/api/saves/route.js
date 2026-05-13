export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { post_id } = await request.json()
    if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('saves').select('id').eq('post_id', post_id).eq('user_id', user.id).single()

    if (existing) {
      await supabase.from('saves').delete().eq('id', existing.id)
      return NextResponse.json({ saved: false })
    } else {
      await supabase.from('saves').insert({ post_id, user_id: user.id })
      return NextResponse.json({ saved: true })
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
