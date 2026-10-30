import { timingSafeEqual } from 'node:crypto'
export default async function runEpisodeAlerts(request) {
 const origin=process.env.URL || process.env.NEXT_PUBLIC_APP_ORIGIN,secret=process.env.EPISODE_CRON_SECRET
 const supplied=request.headers.get('authorization')||'',expected=`Bearer ${secret}`
 if(!secret || Buffer.byteLength(supplied)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return new Response('Unauthorized',{status:401})
 if(!origin)throw new Error('Site URL missing')
 let cursor=null
 try { cursor=(await request.json())?.cursor||null } catch {}
 if(cursor&&!/^[a-f0-9-]{36}$/i.test(cursor))return new Response('Invalid cursor',{status:400})
 const started=Date.now()
 do {
  const endpoint=new URL('/api/cron/episode-alerts',origin);if(cursor)endpoint.searchParams.set('cursor',cursor)
  const res=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(55000)})
  if(!res.ok)throw new Error(`Episode check failed: ${res.status}`)
  const data=await res.json();if(data.failed)console.warn('Release lookups failed:',data.failed)
  cursor=data.nextCursor
  // Continue in a fresh background invocation before Netlify's 15-minute limit.
  if(cursor && Date.now()-started>10*60*1000){
   const next=await fetch(new URL('/.netlify/functions/episode-alerts-background',origin),{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({cursor}),signal:AbortSignal.timeout(15000)})
   if(!next.ok)throw new Error('Could not continue episode check')
   return
  }
 }while(cursor)
}
export const config={background:true}
