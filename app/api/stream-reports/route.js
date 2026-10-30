import { NextResponse } from 'next/server'
import { watchAuth, dbError } from '@/lib/server/watch-db'
import { validateReport } from '@/lib/watch-features.mjs'
export async function POST(request) {
  try {
    const auth = await watchAuth(request); if (auth.error) return auth.error
    const body = validateReport(await request.json()); if (!body) return NextResponse.json({ error: 'Please choose a valid issue.' }, { status: 400 })
    const { count, error: countError } = await auth.supabase.from('stream_reports').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',new Date().toISOString().slice(0,10))
    if(countError) return dbError(countError)
    if(count>=30) return NextResponse.json({error:'You have reached the daily report limit. Please try again tomorrow.'},{status:429})
    const { error } = await auth.supabase.from('stream_reports').insert({ ...body, user_id: auth.user.id })
    if (error && error.code !== '23505') return dbError(error)
    return NextResponse.json({ success: true, duplicate: error?.code === '23505' })
  } catch (error) { return dbError(error) }
}
