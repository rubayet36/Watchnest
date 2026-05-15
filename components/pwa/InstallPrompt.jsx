'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)  // Android
  const [showIOSHint, setShowIOSHint]       = useState(false)
  const [showBanner, setShowBanner]         = useState(false)
  const [dismissed, setDismissed]           = useState(false)

  useEffect(() => {
    // Don't show if already installed or dismissed before
    if (isInStandaloneMode()) return
    if (typeof localStorage !== 'undefined' && localStorage.getItem('pwa-dismissed')) return

    if (isIOS()) {
      // iOS Safari — show manual hint after 3s
      const t = setTimeout(() => setShowIOSHint(true), 3000)
      return () => clearTimeout(t)
    }

    // Android / Chrome — listen for native prompt event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShowBanner(false)
    setShowIOSHint(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function installAndroid() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowBanner(false)
    if (outcome === 'accepted') localStorage.setItem('pwa-dismissed', '1')
  }

  // ── Android install banner ──────────────────────────────────
  if (showBanner && deferredPrompt) {
    return (
      <div style={{
        position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9999,
        background: 'rgba(18,18,32,0.97)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(139,92,246,0.35)', borderRadius: 20,
        padding: '1rem 1.125rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        animation: 'slideUp .35s cubic-bezier(.16,1,.3,1)',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Icon */}
        <div style={{ width:48, height:48, borderRadius:12, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }}>
          <Image src="/android-chrome-192x192.png" alt="WatchNest" width={48} height={48} style={{ objectFit:'cover' }} />
        </div>

        {/* Text */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontWeight:800, fontSize:'0.9375rem', color:'#e2e8f0' }}>Install WatchNest</p>
          <p style={{ margin:'2px 0 0', fontSize:'0.75rem', color:'#64748b', lineHeight:1.4 }}>
            Add to home screen for a better experience
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
          <button onClick={installAndroid} style={{
            padding:'0.4rem 0.875rem', borderRadius:99,
            background:'linear-gradient(135deg,#7c3aed,#db2777)',
            border:'none', cursor:'pointer', color:'#fff',
            fontWeight:700, fontSize:'0.8rem', fontFamily:'inherit',
            whiteSpace:'nowrap',
          }}>
            Install
          </button>
          <button onClick={dismiss} style={{
            padding:'0.3rem 0.5rem', borderRadius:99,
            background:'transparent', border:'none', cursor:'pointer',
            color:'#475569', fontSize:'0.75rem', fontFamily:'inherit',
          }}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  // ── iOS Safari hint ─────────────────────────────────────────
  if (showIOSHint) {
    return (
      <div style={{
        position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9999,
        background: 'rgba(18,18,32,0.97)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(139,92,246,0.35)', borderRadius: 20,
        padding: '1rem 1.125rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        animation: 'slideUp .35s cubic-bezier(.16,1,.3,1)',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div style={{ display:'flex', alignItems:'flex-start', gap:'0.875rem' }}>
          <div style={{ width:44, height:44, borderRadius:10, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }}>
            <Image src="/apple-touch-icon.png" alt="WatchNest" width={44} height={44} style={{ objectFit:'cover' }} />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:'0.9375rem', color:'#e2e8f0' }}>Install WatchNest</p>
            <p style={{ margin:0, fontSize:'0.8125rem', color:'#94a3b8', lineHeight:1.5 }}>
              Tap the{' '}
              <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', fontSize:'0.8rem', color:'#e2e8f0', fontWeight:600 }}>
                <ShareIcon /> Share
              </span>
              {' '}button, then{' '}
              <span style={{ fontWeight:700, color:'#a78bfa' }}>&quot;Add to Home Screen&quot;</span>
            </p>
          </div>
          <button onClick={dismiss} style={{
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:'50%', width:28, height:28, cursor:'pointer',
            color:'#64748b', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, fontFamily:'inherit', lineHeight:1,
          }}>×</button>
        </div>

        {/* Arrow pointing down toward share button */}
        <div style={{ textAlign:'center', marginTop:'0.5rem', fontSize:'1.25rem', color:'#7c3aed' }}>↓</div>
      </div>
    )
  }

  return null
}

function ShareIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1v12M4 5l5-5 5 5M1 14v4a1 1 0 001 1h14a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
