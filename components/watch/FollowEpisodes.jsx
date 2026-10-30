'use client'
import { useQuery,useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import styles from './watch.module.css'
export default function FollowEpisodes({mediaType,mediaId}){
 const {user}=useAuth(),client=useQueryClient(),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const {data,error}=useQuery({queryKey:['episode-subscriptions',user?.id],enabled:!!user,retry:false,refetchOnWindowFocus:false,queryFn:async()=>{const r=await authFetch('/api/episode-subscriptions');const d=await r.json();if(!r.ok)throw new Error(d.error);return d.subscriptions}})
 const followed=data?.find(s=>s.media_type===mediaType&&String(s.media_id)===String(mediaId))
 async function toggle(){if(!user){setMessage('Sign in to follow episodes.');return}setBusy(true);setMessage('');try{
 const r=await authFetch('/api/episode-subscriptions',{method:followed?'DELETE':'POST',body:JSON.stringify(followed?{id:followed.id}:{media_type:mediaType,media_id:mediaId})});const d=await r.json();if(!r.ok)throw new Error(d.error)
 await client.invalidateQueries({queryKey:['episode-subscriptions']});setMessage(followed?'Episode alerts turned off.':'Following. New release alerts will appear in your notifications. Enable device notifications in Settings for push alerts.')
 }catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <div className={styles.panel}><button className={styles.button} disabled={busy} onClick={toggle}>{busy?'Saving…':followed?'Following episodes · Unfollow':'Follow new episodes'}</button><p className={styles.muted}>Release alerts are optional. A release does not guarantee a playable source.</p>{(message||error)&&<p role="status">{message||error.message}</p>}</div>
}
