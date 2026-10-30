import { NextResponse } from 'next/server'
import { watchAuth, dbError } from '@/lib/server/watch-db'
import { summarizeReports } from '@/lib/watch-features.mjs'
export async function GET(request) {
  try {
    const auth = await watchAuth(request,true); if (auth.error) return auth.error
    const status = new URL(request.url).searchParams.get('status') || 'open'
    if (!['open','resolved','all'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    let query = auth.supabase.from('stream_reports').select('*').gte('created_at',new Date(Date.now()-30*86400000).toISOString()).order('created_at',{ascending:false}).limit(500)
    if (status !== 'all') query = query.eq('status',status)
    const { data,error } = await query; if(error) return dbError(error)
    return NextResponse.json({ reports:data, ...summarizeReports(data), limit:500 })
  } catch (error) { return dbError(error) }
}
export async function PATCH(request) {
  try {
    const auth = await watchAuth(request,true); if(auth.error) return auth.error
    const { id,status } = await request.json()
    if (!/^[a-f0-9-]{36}$/i.test(id || '') || !['open','resolved'].includes(status)) return NextResponse.json({ error:'Invalid update' },{ status:400 })
    const { error } = await auth.supabase.from('stream_reports').update({status}).eq('id',id)
    if(error) return dbError(error)
    return NextResponse.json({ success:true })
  } catch (error) { return dbError(error) }
}
