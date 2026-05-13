export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { post_id, reaction_type } = await request.json()
    if (!post_id || !reaction_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: existing } = await supabase
      .from('reactions').select('id')
      .eq('post_id', post_id).eq('user_id', user.id).eq('reaction_type', reaction_type).single()

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
      return NextResponse.json({ reacted: false })
    } else {
      await supabase.from('reactions').delete().eq('post_id', post_id).eq('user_id', user.id)
      await supabase.from('reactions').insert({ post_id, user_id: user.id, reaction_type })

      // Create notification
      const { data: postData } = await supabase.from('posts').select('user_id').eq('id', post_id).single()
      if (postData && postData.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          actor_id: user.id,
          type: 'reaction',
          post_id: post_id,
        })
      }

      return NextResponse.json({ reacted: true, reaction_type })
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
