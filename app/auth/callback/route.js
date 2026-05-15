import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Netlify's internal router sometimes rewrites request.url to the raw .netlify.app domain.
  // Prefer forwarded headers only when they are present; locally, request.url already has
  // the correct http://localhost origin.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const origin = forwardedHost
    ? `${forwardedProto || url.protocol.replace(':', '')}://${forwardedHost}`
    : url.origin

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
