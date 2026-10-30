'use client'
import { useRef } from 'react'
import styles from './watch.module.css'
export default function EpisodeDrawer({children}){
 const dialog=useRef(null)
 return <><button className={styles.button} onClick={()=>dialog.current.showModal()}>Choose episode</button><dialog ref={dialog} className={styles.drawer} aria-label="Choose episode" onClick={e=>{if(e.target===dialog.current)dialog.current.close()}}><div className={styles.row}><h2 style={{flex:1}}>Episodes</h2><button className={styles.button} onClick={()=>dialog.current.close()} aria-label="Close episode picker">Close</button></div><div onClick={e=>{if(e.target.closest('a')||e.target.closest('[data-episode]'))dialog.current.close()}}>{children}</div></dialog></>
}
