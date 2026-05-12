import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Upsert profile from Google data
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
        avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        username: data.user.email?.split('@')[0],
      }, { onConflict: 'id', ignoreDuplicates: false })

      return NextResponse.redirect(`${origin}${next}`)
    }

    // Exchange failed — log the error but still try to redirect home
    // The client-side onAuthStateChange may still recover the session
    console.error('[auth/callback] code exchange error:', error?.message)
  }

  // No code param means implicit flow token is in the URL hash —
  // redirect to home and let the client-side Supabase pick it up
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

