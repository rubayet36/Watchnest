export const runtime = 'nodejs'

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
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ session: null })
    return NextResponse.json({
      session: {
        user,
      }
    })
  } catch (e) {
    return NextResponse.json({ session: null, error: e.message })
  }
}
