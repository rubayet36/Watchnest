import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { serviceDb } from '@/lib/server/watch-db'
import { latestEpisode } from '@/lib/server/catalog'
import { checkEpisodeBatch } from '@/lib/episode-check.mjs'
import { sendPushToUser } from '@/lib/push'
export const runtime='nodejs'
export const maxDuration=60
export async function POST(request){
 const secret=process.env.EPISODE_CRON_SECRET, supplied=request.headers.get('authorization')||''
 const expected=`Bearer ${secret}`
 if(!secret || Buffer.byteLength(supplied)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const db=serviceDb(),cursor=new URL(request.url).searchParams.get('cursor')
  if(cursor&&!/^[a-f0-9-]{36}$/i.test(cursor))return NextResponse.json({error:'Invalid cursor'},{status:400})
  let query=db.from('episode_subscriptions').select('*').order('id').limit(20);if(cursor)query=query.gt('id',cursor)
  const {data:rows,error}=await query;if(error)throw error
  const {sent,failed}=await checkEpisodeBatch(rows,{
   latest:latestEpisode,
   insertAlert:async(row,release)=>{
    const {data,error}=await db.from('episode_alerts').upsert({subscription_id:row.id,user_id:row.user_id,episode_key:release.key,title:`${release.title}: ${release.label} released`,link:release.link},{onConflict:'subscription_id,episode_key',ignoreDuplicates:true}).select('id')
    if(error)throw error;return data?.[0]||null
   },
   saveBaseline:async(row,key)=>{const {error}=await db.from('episode_subscriptions').update({last_episode_key:key}).eq('id',row.id);if(error)throw error},
   push:async(row,release,alert)=>sendPushToUser(row.user_id,{body:`${release.title}: ${release.label} released`,tag:alert.id,url:release.link}),
  })
  return NextResponse.json({sent,failed,nextCursor:rows.length===20?rows.at(-1).id:null})
 }catch{return NextResponse.json({error:'Episode check failed; check database setup.'},{status:503})}
}
