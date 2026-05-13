import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Netlify's internal router sometimes rewrites request.url to the raw .netlify.app domain.
  // We read the forwarded host header to ensure we redirect back to the custom domain.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const origin = host ? `${protocol}://${host}` : url.origin

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

  // No code param = implicit flow — token is in the URL hash.
  // The server can't read URL hashes, so redirect to the home page.
  // The client-side onAuthStateChange in AuthContext will pick up the
  // session automatically from the hash fragment.
  return NextResponse.redirect(`${origin}/`)
}

