'use client'

import { useEffect, useState, useRef } from 'react'
import { parsePlayerProgress } from '@/lib/watch-features.mjs'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Key this component by URL so load/error/timer state belongs to one embed only.
export default function EmbedPlayer({ url, label, onLoaded, identity, onProgress }) {
  const frame = useRef(null)
  useEffect(() => {
    if (!url || !identity || !onProgress || new URL(url).origin !== 'https://vidsrc.sh') return
    const listen = event => { const progress = parsePlayerProgress(event, frame.current?.contentWindow, new URL(url).origin, identity); if (progress) onProgress(progress) }
    window.addEventListener('message',listen)
    return () => window.removeEventListener('message',listen)
  },[url,identity,onProgress])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState('loading')
  useEffect(() => {
    if (state !== 'loading') return
    const timer = setTimeout(() => setState('slow'), 15000)
    return () => clearTimeout(timer)
  }, [attempt, state])

  if (!url) return <p role="status" style={{ padding: 24, color: '#cbd5e1' }}>Episode information is unavailable. Please reopen this title once its season details are available.</p>

  return <>
    {state === 'loading' && <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', display: 'grid', placeContent: 'center', background: '#0D0E12' }}>
      <LoadingSpinner size="md" />
      <p style={{ color: '#9A9CA3' }}>Opening player…</p>
    </div>}
    <iframe
      ref={frame}
      key={attempt}
      src={url}
      title={`${label} player`}
      width="100%" height="100%" className="stream-frame"
      allowFullScreen
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
      referrerPolicy="origin"
      onLoad={() => { setState('loaded'); onLoaded() }}
      onError={() => setState('error')}
    />
    <button type="button" onClick={() => { const element = frame.current; if (element?.requestFullscreen) element.requestFullscreen().catch(() => {}); }} style={{position:"absolute",bottom:8,right:8,zIndex:3,minHeight:44,padding:"8px 12px",background:"#15171cee",color:"white",borderRadius:8}}>Fullscreen</button>
    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'flex', gap: 8, alignItems: 'center', maxWidth: '95%', background: '#15171cee', borderRadius: 8, padding: 6 }}>
      {['slow', 'error'].includes(state) && <span role="status" style={{ color: '#cbd5e1', fontSize: 12 }}>Player not responding? Retry or switch source below.</span>}
      <button type="button" onClick={() => { setState('loading'); setAttempt(value => value + 1) }} style={{ color: '#fff', padding: '6px 10px', cursor: 'pointer' }}>Reload player</button>
    </div>
  </>
}
