import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { supabase } = await getAuthFromHeader(request)
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('post_id')

    if (!postId) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles:user_id(id, name, avatar_url, username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ comments: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { post_id, content } = await request.json()
    if (!post_id || !content?.trim()) {
      return NextResponse.json({ error: 'post_id and content required' }, { status: 400 })
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({ post_id, user_id: user.id, content: content.trim() })
      .select('id, content, created_at, user_id, profiles:user_id(id, name, avatar_url, username)')
      .single()

    if (error) throw error

    // Create notification if the comment is on someone else's post
    const { data: postData } = await supabase.from('posts').select('user_id').eq('id', post_id).single()
    
    if (postData && postData.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: postData.user_id,
        actor_id: user.id,
        type: 'comment',
        post_id: post_id,
      })
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
