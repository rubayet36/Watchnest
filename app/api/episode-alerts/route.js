import { NextResponse } from 'next/server'
import { watchAuth, dbError } from '@/lib/server/watch-db'
export async function GET(request){try{const auth=await watchAuth(request);if(auth.error)return auth.error
 const {data,error}=await auth.supabase.from('episode_alerts').select('id,title,link,read,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(50)
 if(error)return dbError(error);return NextResponse.json({alerts:data})}catch(error){return dbError(error)}}
export async function PATCH(request){try{const auth=await watchAuth(request);if(auth.error)return auth.error
 const {id}=await request.json();if(id&&!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Invalid alert'},{status:400})
 let query=auth.supabase.from('episode_alerts').update({read:true}).eq('user_id',auth.user.id);if(id)query=query.eq('id',id)
 const {error}=await query;if(error)return dbError(error);return NextResponse.json({success:true})}catch(error){return dbError(error)}}
