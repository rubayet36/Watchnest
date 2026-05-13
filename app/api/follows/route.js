export const runtime = 'edge'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return NextResponse.json({ users: [], sent: [], received: [] })

    const [{ data: users }, { data: sent }, { data: received }] = await Promise.all([
      supabase.from('profiles').select('id, name, avatar_url, username, bio').neq('id', user.id).limit(100),
      supabase.from('follows').select('*').eq('follower_id', user.id),
      supabase.from('follows').select('*, profiles:follower_id(id, name, avatar_url, username)').eq('following_id', user.id),
    ])

    return NextResponse.json({ users: users||[], sent: sent||[], received: received||[] })
  } catch (e) {
    return NextResponse.json({ error: e.message, users:[], sent:[], received:[] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { following_id } = await request.json()
    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })

    const { error, data } = await supabase.from('follows').upsert(
      { follower_id: user.id, following_id, status: 'pending' },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: false }
    ).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create notification for follow request
    await supabase.from('notifications').insert({
      user_id: following_id,
      actor_id: user.id,
      type: 'follow_request',
    })

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { follow_id, status } = await request.json()
    if (!follow_id || !status) return NextResponse.json({ error: 'follow_id and status required' }, { status: 400 })

    const { error } = await supabase.from('follows')
      .update({ status })
      .eq('id', follow_id)
      .eq('following_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { following_id } = await request.json()
    const { error } = await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('following_id', following_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
