export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthFromHeader, unauthorized } from '@/lib/api-auth'

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    { auth: { persistSession: false } }
  )
}

async function withTimeout(promise, message, timeoutMs = 8_000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function requireAdmin(request) {
  const { supabase, user } = await getAuthFromHeader(request)
  if (!user) return { error: unauthorized() }

  const { data: profile, error } = await withTimeout(
    supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single(),
    'Admin profile check timed out'
  )

  if (error || profile?.account_type !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  const admin = getAdminClient()
  if (!admin) {
    return { error: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 }) }
  }

  return { admin, user }
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error

    const { data, error } = await withTimeout(
      auth.admin
        .from('profiles')
        .select('id, email, name, username, avatar_url, account_type, approved, approved_at, created_at')
        .order('approved', { ascending: true })
        .order('created_at', { ascending: false }),
      'Approval queue query timed out'
    )

    if (error) throw error
    return NextResponse.json({ users: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error

    const { userId, approved } = await request.json()
    if (!userId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'userId and approved are required' }, { status: 400 })
    }

    const { data, error } = await withTimeout(
      auth.admin
        .from('profiles')
        .update({
          approved,
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? auth.user.id : null,
        })
        .eq('id', userId)
        .neq('account_type', 'admin')
        .select('id, email, name, username, avatar_url, account_type, approved, approved_at, created_at')
        .single(),
      'Approval update timed out'
    )

    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
