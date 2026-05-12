import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let client = null

export function createClient() {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          storageKey: 'watchnest-auth',
          flowType: 'pkce',
        },
      }
    )
  }
  return client
}
