

import { getAuthFromHeader } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

/**
 * Service-role client — bypasses RLS.
 * Only used server-side for cross-user writes (e.g. sharing to partner's watchlist).
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    // 1. Authenticate the sender via their Bearer token
    const { user } = await getAuthFromHeader(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { post_id, partner_id } = body

    if (!post_id || !partner_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 2. Use service-role client to bypass RLS when writing to partner's saves
    const admin = getAdminClient()

    const { error: saveError } = await admin
      .from('saves')
      .upsert(
        { user_id: partner_id, post_id, shared_by: user.id, watched: false },
        { onConflict: 'post_id,user_id' }
      )

    if (saveError) {
      console.error('[share] saves upsert error:', saveError)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    // 3. Notify the partner (non-fatal)
    const { error: notifError } = await admin.from('notifications').insert({
      user_id:  partner_id,
      actor_id: user.id,
      type:     'share',
      post_id,
    })
    if (notifError) {
      console.warn('[share] notification insert failed (non-fatal):', notifError.message)
    }

    const { data: post } = await admin
      .from('posts')
      .select('title, tmdb_id, media_type')
      .eq('id', post_id)
      .single()

    await sendPushToUser(partner_id, {
      body: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone'} shared ${post?.title || 'a title'} with you`,
      tag: `share-${post_id}`,
      url: '/watchlist',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[share] unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
