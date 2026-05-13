export const runtime = 'edge'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ session: null })
    return NextResponse.json({
      session: {
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_at:    session.expires_at,
        user:          session.user,
      }
    })
  } catch (e) {
    return NextResponse.json({ session: null, error: e.message })
  }
}
