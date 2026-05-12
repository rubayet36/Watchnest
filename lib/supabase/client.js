import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient stores the PKCE code_verifier in cookies so the
// server-side /auth/callback route (which also uses @supabase/ssr) can
// read it during the code exchange. Using plain supabase-js here would
// store it in localStorage which the server cannot access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
