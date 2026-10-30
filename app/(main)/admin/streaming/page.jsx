'use client'
import { useState } from 'react'
import { useQuery,useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import styles from '@/components/watch/watch.module.css'
export default function StreamingIssues(){
 const {profile,loading}=useAuth(),[status,setStatus]=useState('open'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),client=useQueryClient()
 const admin=profile?.account_type==='admin'
 const {data,error,isFetching,refetch}=useQuery({queryKey:['stream-reports',status],enabled:admin,queryFn:async()=>{const r=await authFetch(`/api/admin/stream-reports?status=${status}`);const d=await r.json();if(!r.ok)throw new Error(d.error);return d}})
 async function update(id,status){setBusy(true);setMessage('');try{const r=await authFetch('/api/admin/stream-reports',{method:'PATCH',body:JSON.stringify({id,status})});if(!r.ok)throw new Error((await r.json()).error);await client.invalidateQueries({queryKey:['stream-reports']})}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 if(loading)return <p className={styles.page}>Checking access…</p>
 if(!admin)return <p className={styles.page}>Admin access required.</p>
 return <div className={styles.page}><h1>Streaming issues</h1><p className={styles.muted}>User-reported problems from the last 30 days. Counts show the latest 500 matching reports, not provider uptime.</p><div className={styles.filters}><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{['open','resolved','all'].map(s=><option key={s}>{s}</option>)}</select></label><button className={styles.button} onClick={()=>refetch()}>Refresh</button></div>
 {(error||message)&&<p role="alert">{message||error.message}</p>}{isFetching&&<p>Loading reports…</p>}
 <div className={styles.grid}><section className={styles.panel}><h2>By source</h2>{data?.providers.map(p=><p key={p.name}>{p.name}: <b>{p.count}</b></p>)}</section><section className={styles.panel}><h2>Most reported titles</h2>{data?.titles.slice(0,10).map((t,i)=><p key={i}>{t.title}: <b>{t.count}</b></p>)}</section></div>
 <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Title / episode</th><th>Provider</th><th>Issue</th><th>Date</th><th>Action</th></tr></thead><tbody>{data?.reports.map(r=><tr key={r.id}><td>{r.title}<br/><small>{r.media_type} {r.season?`S${r.season}`:''} {r.episode?`E${r.episode}`:''}</small></td><td>{r.provider}</td><td>{r.reason.replaceAll('_',' ')}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><button className={styles.button} disabled={busy} onClick={()=>update(r.id,r.status==='open'?'resolved':'open')}>{r.status==='open'?'Resolve':'Reopen'}</button></td></tr>)}</tbody></table></div>{data&&!data.reports.length&&<p>No reports match this view.</p>}</div>
}
