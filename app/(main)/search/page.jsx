'use client'
import { useState,useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import styles from '@/components/watch/watch.module.css'
export default function CatalogSearch(){
 const [input,setInput]=useState(''),[q,setQ]=useState(''),[filters,setFilters]=useState({type:'all',genre:'',year:'',language:''}),[page,setPage]=useState(1)
 useEffect(()=>{const timer=setTimeout(()=>{setQ(input.trim());setPage(1)},350);return()=>clearTimeout(timer)},[input])
 const {data,isFetching,error,refetch}=useQuery({queryKey:['catalog',q,filters,page],queryFn:async({signal})=>{const r=await fetch(`/api/catalog?${new URLSearchParams({q,...filters,page:String(page)})}`,{signal});const d=await r.json();if(!r.ok)throw new Error(d.error||d.warnings?.join(' ')||'Search unavailable');return d}})
 const change=(key,value)=>{setFilters(f=>({...f,[key]:value}));setPage(1)}
 return <div className={styles.page}><h1>Find your next watch</h1><p className={styles.muted}>Movies, series and anime in one search.</p><div className={styles.filters}>
 <label style={{flexBasis:'100%'}}>Search titles<input type="search" placeholder="Search movies, series or anime" value={input} onChange={e=>setInput(e.target.value)}/></label>
 <label>Type<select aria-label="Type" value={filters.type} onChange={e=>change('type',e.target.value)}>{['all','movie','tv','anime'].map(t=><option key={t} value={t}>{t==='tv'?'Series':t}</option>)}</select></label>
 <label>Genre<select aria-label="Genre" value={filters.genre} onChange={e=>change('genre',e.target.value)}><option value="">All genres</option>{['Action','Comedy','Drama','Animation','Mystery','Crime','Documentary'].map(g=><option key={g}>{g}</option>)}</select></label>
 <label>Year<input type="number" min="1900" max="2100" placeholder="Any year" value={filters.year} onChange={e=>change('year',e.target.value)}/></label>
 <label>Original language<select aria-label="Original language" value={filters.language} onChange={e=>change('language',e.target.value)}><option value="">All languages</option>{Object.entries({en:'English',bn:'Bangla',hi:'Hindi',ja:'Japanese',ko:'Korean',zh:'Chinese'}).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 </div><p className={styles.muted}>Language filters use catalogue metadata, not available dub/sub tracks. Genre, year and language filters apply to each results page.</p>
 {isFetching&&<p role="status">Searching…</p>}{error&&<p role="alert">{error.message} <button className={styles.button} onClick={()=>refetch()}>Retry</button></p>}
 {data?.warnings?.map(w=><p className={styles.error} key={w}>{w}</p>)}
 <div className={styles.grid}>{data?.results?.map(m=><Link className={styles.card} href={m.href} key={`${m.type}:${m.id}`}>{m.image?<Image src={m.image} alt="" width={342} height={513} style={{width:"100%",height:"auto"}}/>:<div style={{aspectRatio:'2/3'}}>No poster</div>}<h3>{m.title}</h3><p className={styles.muted}>{m.type} · {m.year||'Year unknown'}{m.status==='NOT_YET_RELEASED'?' · Upcoming':''}</p></Link>)}</div>
 {!isFetching&&data?.results?.length===0&&<p>No matches on this page. Try fewer filters{data.hasMore?' or the next page':''}.</p>}
 <div className={styles.row} style={{marginTop:24}}><button className={styles.button} disabled={page===1||isFetching} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button className={styles.button} disabled={!data?.hasMore||isFetching} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
}
