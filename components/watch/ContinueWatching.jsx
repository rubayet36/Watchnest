'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { resumeUrl,progressPercent } from '@/lib/watch-features.mjs'
import styles from './watch.module.css'
const subscribe=fn=>{window.addEventListener('watch-history-changed',fn);window.addEventListener('storage',fn);return()=>{window.removeEventListener('watch-history-changed',fn);window.removeEventListener('storage',fn)}}
const snapshot=()=>{try{return localStorage.getItem('watch_history')||'[]'}catch{return '[]'}}
export default function ContinueWatching(){
 const raw=useSyncExternalStore(subscribe,snapshot,()=> '[]')
 let history=[]
 try { const parsed=JSON.parse(raw); if(Array.isArray(parsed)) history=parsed.filter(h=>!h.progress?.completed).slice(0,10) } catch {}
 if(!history.length)return null
 return <section className={styles.panel}><div className={styles.row}><h2 style={{flex:1}}>Continue Watching</h2><Link className={styles.button} href="/history">All history</Link></div><div className={styles.shelf}>{history.map(item=>{
 const percent=progressPercent(item.progress),image=item.poster_path?.startsWith('https://')?item.poster_path:item.poster_path?`https://image.tmdb.org/t/p/w342${item.poster_path}`:null
 return <Link key={`${item.media_type}:${item.id}`} href={resumeUrl(item)} className={styles.card}>{image&&<Image src={image} alt="" width={320} height={200} style={{width:"100%",height:"auto",objectFit:"cover"}}/>}<strong>{item.title}</strong><p className={styles.muted}>{item.media_type==='tv'?`S${item.progress?.season||1} · E${item.progress?.episode||1}`:item.media_type==='anime'?`Episode ${item.progress?.epNum||1}`:'Movie'}</p>{percent!==null?<><div className={styles.bar}><span style={{width:`${percent}%`}}/></div><small>{Math.floor(item.progress.currentTime/60)} min watched</small></>:<small>Resume episode</small>}</Link>
 })}</div></section>
}
