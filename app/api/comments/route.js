export const runtime = 'nodejs'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

export async function GET(request) {
  try {
    const { supabase } = await getAuthFromHeader(request)
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('post_id')

    if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

    // Try fetching with parent_id (requires migration to have been run)
    let data, error
    ;({ data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, parent_id, profiles:user_id(id, name, avatar_url, username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true }))

    // Graceful fallback: if parent_id column doesn't exist yet, fetch without it
    if (error && error.message?.includes('parent_id')) {
      ;({ data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, profiles:user_id(id, name, avatar_url, username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }))
    }

    if (error) throw error

    // Build threaded structure: separate top-level from replies
    const all = data || []
    const topLevel = all.filter(c => !c.parent_id)
    const repliesMap = {}
    for (const c of all) {
      if (c.parent_id) {
        if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = []
        repliesMap[c.parent_id].push(c)
      }
    }
    const threaded = topLevel.map(c => ({ ...c, replies: repliesMap[c.id] || [] }))

    return NextResponse.json({ comments: threaded })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { post_id, content, parent_id } = await request.json()
    if (!post_id || !content?.trim()) {
      return NextResponse.json({ error: 'post_id and content required' }, { status: 400 })
    }

    // Insert comment (with optional parent_id for replies)
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        user_id:   user.id,
        content:   content.trim(),
        parent_id: parent_id || null,
      })
      .select('id, content, created_at, user_id, parent_id, profiles:user_id(id, name, avatar_url, username)')
      .single()

    if (error) throw error

    // Notify the post owner (if not self)
    const { data: postData } = await supabase.from('posts').select('user_id, title, tmdb_id, media_type').eq('id', post_id).single()
    if (postData && postData.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id:  postData.user_id,
        actor_id: user.id,
        type:     parent_id ? 'reply' : 'comment',
        post_id,
      })
      await sendPushToUser(postData.user_id, {
        body: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone'} ${parent_id ? 'replied on' : 'commented on'} ${postData.title}`,
        tag: `${parent_id ? 'reply' : 'comment'}-${post_id}`,
        url: `/media/${postData.media_type || 'movie'}/${postData.tmdb_id}`,
      })
    }

    // If it's a reply, also notify the parent comment author (if different)
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('comments').select('user_id').eq('id', parent_id).single()
      if (parentComment && parentComment.user_id !== user.id && parentComment.user_id !== postData?.user_id) {
        await supabase.from('notifications').insert({
          user_id:  parentComment.user_id,
          actor_id: user.id,
          type:     'reply',
          post_id,
        })
        await sendPushToUser(parentComment.user_id, {
          body: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone'} replied to your comment on ${postData?.title || 'WatchNest'}`,
          tag: `reply-${parent_id}`,
          url: `/media/${postData?.media_type || 'movie'}/${postData?.tmdb_id || ''}`,
        })
      }
    }

    return NextResponse.json({ success: true, comment })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
