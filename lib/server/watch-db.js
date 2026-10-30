import { createClient } from '@supabase/supabase-js'
import { getAuthFromHeader } from '@/lib/api-auth'
import { databaseFailure } from '@/lib/service-errors.mjs'
import { NextResponse } from 'next/server'
export function serviceDb() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw Object.assign(new Error('Episode alerts are not configured yet.'), { code: 'SERVER_CONFIG_MISSING' })
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}
export async function watchAuth(request, adminOnly = false) {
  const auth = await getAuthFromHeader(request)
  if (!auth.user) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
  if (adminOnly) {
    const { data, error } = await auth.supabase.from('profiles').select('account_type').eq('id', auth.user.id).single()
    if (error || data?.account_type !== 'admin') return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  }
  return auth
}
export function dbError(error) {
  const failure = databaseFailure(error)
  // Do not log raw database errors, SQL, credentials, or personal data.
  console.error('[watch-db]', { code: failure.code })
  return NextResponse.json(failure, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
