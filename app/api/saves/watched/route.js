import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  try {
    const { supabase, user } = await getAuthFromHeader(request)
    if (!user) return unauthorized()

    const { save_id, watched } = await request.json()
    if (!save_id) return NextResponse.json({ error: 'save_id required' }, { status: 400 })

    const { error } = await supabase.from('saves')
      .update({ watched })
      .eq('id', save_id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, watched })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
