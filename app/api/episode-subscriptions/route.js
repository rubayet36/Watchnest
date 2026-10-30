import { NextResponse } from 'next/server'
import { watchAuth, serviceDb, dbError } from '@/lib/server/watch-db'
import { latestEpisode } from '@/lib/server/catalog'
import { validId } from '@/lib/watch-features.mjs'
export async function GET(request) {
 try {const auth=await watchAuth(request);if(auth.error)return auth.error
 const {data,error}=await auth.supabase.from('episode_subscriptions').select('id,media_id,media_type,title').order('created_at',{ascending:false});if(error)return dbError()
 return NextResponse.json({subscriptions:data})}catch{return dbError()}
}
export async function POST(request) {
 try {const auth=await watchAuth(request);if(auth.error)return auth.error
 const {media_type,media_id}=await request.json()
 if(!['tv','anime'].includes(media_type)||!validId(media_id))return NextResponse.json({error:'Choose a series or anime.'},{status:400})
 const {count,error:countError}=await auth.supabase.from('episode_subscriptions').select('id',{count:'exact',head:true});if(countError)return dbError()
 if(count>=100)return NextResponse.json({error:'You can follow up to 100 series.'},{status:400})
 const release=await latestEpisode(media_type,media_id)
 const {error}=await serviceDb().from('episode_subscriptions').upsert({user_id:auth.user.id,media_type,media_id:Number(media_id),title:release.title,last_episode_key:release.key},{onConflict:'user_id,media_type,media_id',ignoreDuplicates:true})
 if(error)return dbError();return NextResponse.json({success:true})
 }catch{return dbError()}
}
export async function DELETE(request){try{const auth=await watchAuth(request);if(auth.error)return auth.error
 const {id}=await request.json();if(!/^[a-f0-9-]{36}$/i.test(id||''))return NextResponse.json({error:'Invalid subscription'},{status:400})
 const {error}=await auth.supabase.from('episode_subscriptions').delete().eq('id',id).eq('user_id',auth.user.id)
 if(error)return dbError();return NextResponse.json({success:true})}catch{return dbError()}}
