import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// NOTE: No edge runtime — needs Node.js so cookies() can be set on the response.
// Edge runtime's cookieStore.set() silently fails, breaking the PKCE code exchange.

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  // Netlify's internal router sometimes rewrites request.url to the raw .netlify.app domain.
  // Prefer forwarded headers only when they are present; locally, request.url already has
  // the correct http://localhost origin.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const origin = forwardedHost
    ? `${forwardedProto || url.protocol.replace(':', '')}://${forwardedHost}`
    : url.origin

  if (code) {
    // Build the success redirect response FIRST so Supabase can attach
    // session cookies directly to it (not via next/headers which is broken on Edge).
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Write auth tokens onto the redirect response headers
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Upsert profile from provider metadata.
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
        avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        username: data.user.email?.split('@')[0],
      }, { onConflict: 'id', ignoreDuplicates: false })

      return response
    }

    console.error('[auth/callback] code exchange error:', error?.message)
  }

  // No code param or exchange failed — go home and let the client
  // recover via onAuthStateChange if possible.
  return NextResponse.redirect(`${origin}/`)
}
