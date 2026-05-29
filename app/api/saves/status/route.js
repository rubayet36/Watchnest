export const runtime = 'nodejs'

import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { save_id, watch_status } = await request.json()
    if (!save_id || !watch_status) {
      return NextResponse.json({ error: 'save_id and watch_status required' }, { status: 400 })
    }

    const watched = watch_status === 'watched'

    // Try to update both columns
    const { error: dbError } = await supabase.from('saves')
      .update({ watch_status, watched })
      .eq('id', save_id)
      .eq('user_id', user.id)

    if (dbError) {
      // Fallback: if the watch_status column doesn't exist, try updating only the watched column
      const errorMsg = dbError.message || ''
      if (errorMsg.includes('column "watch_status"') || dbError.code === 'PGRST100' || errorMsg.includes('column') || errorMsg.includes('not exist')) {
        const { error: fallbackError } = await supabase.from('saves')
          .update({ watched })
          .eq('id', save_id)
          .eq('user_id', user.id)

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, watch_status, watched, fallback: true })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, watch_status, watched, fallback: false })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
