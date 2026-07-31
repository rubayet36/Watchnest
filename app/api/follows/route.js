export const runtime = 'nodejs'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return NextResponse.json({ users: [], partners: [], sent: [], received: [] })

    const [{ data: users }, { data: followsAsFollower }, { data: followsAsFollowing }] = await Promise.all([
      supabase.from('profiles').select('id, name, avatar_url, username, bio').neq('id', user.id).limit(100),
      supabase.from('follows').select('*, receiver:following_id(id, name, avatar_url, username, bio)').eq('follower_id', user.id),
      supabase.from('follows').select('*, sender:follower_id(id, name, avatar_url, username, bio)').eq('following_id', user.id),
    ])

    const partnersMap = new Map()
    const sent = []
    const received = []

    for (const f of (followsAsFollower || [])) {
      if (f.status === 'accepted' && f.receiver) {
        partnersMap.set(f.receiver.id, f.receiver)
      } else if (f.status === 'pending' && f.receiver) {
        sent.push({ id: f.id, status: f.status, receiver: f.receiver })
      }
    }

    for (const f of (followsAsFollowing || [])) {
      if (f.status === 'accepted' && f.sender) {
        partnersMap.set(f.sender.id, f.sender)
      } else if (f.status === 'pending' && f.sender) {
        received.push({ id: f.id, status: f.status, sender: f.sender })
      }
    }

    const partners = Array.from(partnersMap.values())

    return NextResponse.json({
      users: users || [],
      partners,
      sent,
      received,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message, users: [], partners: [], sent: [], received: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const targetId = body.following_id || body.target_id
    if (!targetId) return NextResponse.json({ error: 'following_id or target_id required' }, { status: 400 })

    const { error } = await supabase.from('follows').upsert(
      { follower_id: user.id, following_id: targetId, status: 'pending' },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: false }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create notification for follow request
    await supabase.from('notifications').insert({
      user_id: targetId,
      actor_id: user.id,
      type: 'follow_request',
    }).catch(() => {})

    await sendPushToUser(targetId, {
      body: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone'} sent you a partner request`,
      tag: `follow-${user.id}`,
      url: '/watchlist',
    }).catch(() => {})

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const followId = body.follow_id || body.followId
    const action = body.action
    const status = body.status || (action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : null)

    if (!followId || !status) return NextResponse.json({ error: 'follow_id and status required' }, { status: 400 })

    if (status === 'declined') {
      const { error } = await supabase.from('follows').delete().eq('id', followId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: 'declined' })
    }

    const { error } = await supabase.from('follows')
      .update({ status })
      .eq('id', followId)

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

    const body = await request.json()
    const targetId = body.following_id || body.target_id
    if (!targetId) return NextResponse.json({ error: 'target_id or following_id required' }, { status: 400 })

    const { error } = await supabase.from('follows').delete()
      .or(`and(follower_id.eq.${user.id},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${user.id})`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
