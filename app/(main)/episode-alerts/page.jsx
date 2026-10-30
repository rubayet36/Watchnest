'use client'
import Link from 'next/link'
import { useQuery,useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuth } from '@/context/AuthContext'
import styles from '@/components/watch/watch.module.css'
async function read(url){const r=await authFetch(url);const d=await r.json();if(!r.ok)throw new Error(d.error);return d}
export default function EpisodeAlerts(){
 const {user}=useAuth(),client=useQueryClient(),[message,setMessage]=useState('')
 const {data,error}=useQuery({queryKey:['episode-alerts',user?.id],enabled:!!user,retry:false,refetchOnWindowFocus:false,queryFn:()=>read('/api/episode-alerts')})
 const subs=useQuery({queryKey:['episode-subscriptions',user?.id],enabled:!!user,retry:false,refetchOnWindowFocus:false,queryFn:async()=>(await read('/api/episode-subscriptions')).subscriptions})
 async function mutate(url,body,method){try{const r=await authFetch(url,{method,body:JSON.stringify(body)});if(!r.ok)throw new Error((await r.json()).error);await client.invalidateQueries({queryKey:['episode-alerts']});await client.invalidateQueries({queryKey:['episode-subscriptions']});await client.invalidateQueries({queryKey:['notifications']})}catch(e){setMessage(e.message)}}
 return <div className={styles.page}><h1>Episode alerts</h1><p className={styles.muted}>Follow series and anime from their title pages. Alerts announce releases, not streaming availability.</p><Link href="/settings" className={styles.button}>Device notification settings</Link>{!user&&<p>Sign in to manage alerts.</p>}{(error||subs.error||message)&&<p role="alert">{message||error?.message||subs.error?.message}</p>}
 <section className={styles.panel}><h2>Recent releases</h2><button className={styles.button} onClick={()=>mutate('/api/episode-alerts',{},'PATCH')}>Mark all read</button>{data?.alerts.map(a=><p key={a.id}><Link href={a.link} onClick={()=>mutate('/api/episode-alerts',{id:a.id},'PATCH')}>{a.read?'':'● '}{a.title}</Link></p>)}{data?.alerts.length===0&&<p>No new releases since you followed your series.</p>}</section>
 <section className={styles.panel}><h2>Following</h2>{subs.data?.map(s=><div className={styles.row} key={s.id} style={{marginBottom:10}}><Link style={{flex:1}} href={s.media_type==='anime'?`/anime/${s.media_id}`:`/media/tv/${s.media_id}`}>{s.title}</Link><button className={styles.button} onClick={()=>mutate('/api/episode-subscriptions',{id:s.id},'DELETE')}>Unfollow</button></div>)}{subs.data?.length===0&&<p>You are not following any series yet.</p>}</section></div>
}
