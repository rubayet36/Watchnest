'use client'
import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { REPORT_REASONS } from '@/lib/watch-features.mjs'
import styles from './watch.module.css'
export default function PlaybackFeedback({ identity, provider, onSwitch }) {
 const [open,setOpen]=useState(false),[reason,setReason]=useState('not_playing'),[pending,setPending]=useState(false),[message,setMessage]=useState('')
 async function report(){setPending(true);setMessage('');try{
  const res=await authFetch('/api/stream-reports',{method:'POST',body:JSON.stringify({...identity,provider:provider||'lookup',reason})});const data=await res.json()
  if(!res.ok)throw new Error(data.error||'Could not submit the report.')
  setMessage(data.duplicate?'You already reported this issue today.':'Report sent. Thank you.')
 }catch(e){setMessage(e.message)}finally{setPending(false)}}
 return <section className={styles.panel} aria-label="Playback help"><div className={styles.row}>
  <button className={styles.button} onClick={()=>setOpen(!open)} aria-expanded={open}>Not playing?</button>
  {onSwitch&&<button className={styles.button} onClick={onSwitch}>Try another source</button>}
 </div>{open&&<div><p className={styles.muted}>Try another source if the player opens but the video does not play. You can also report the problem.</p><div className={styles.row}>
 <label>Issue <select value={reason} onChange={e=>setReason(e.target.value)}>{REPORT_REASONS.map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></label>
 <button className={`${styles.button} ${styles.primary}`} disabled={pending} onClick={report}>{pending?'Sending…':'Report issue'}</button></div></div>}
 {message&&<p role="status">{message}</p>}</section>
}
