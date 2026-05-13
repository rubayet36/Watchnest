'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Avatar from '@/components/ui/Avatar'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'

const S = {
  overlay:  { position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
  backdrop: { position:'absolute', inset:0, background:'rgba(5,5,15,0.75)' },
  modal:    { position:'relative', zIndex:10, width:'100%', maxWidth:400, maxHeight:'90dvh', display:'flex', flexDirection:'column', background:'rgba(18,18,32,0.97)', backdropFilter:'blur(24px)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:24 },
  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)' },
  body:     { padding:'1.25rem 1.5rem', overflowY:'auto', display:'flex', flexDirection:'column', gap:'1rem' },
  closeBtn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.375rem', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' },
  userRow:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' },
  sendBtn:  { display:'flex', alignItems:'center', gap:4, padding:'0.4rem 0.8rem', borderRadius:99, fontSize:'0.75rem', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'rgba(124,58,237,0.15)', color:'#c4b5fd' },
  sentBtn:  { display:'flex', alignItems:'center', gap:4, padding:'0.4rem 0.8rem', borderRadius:99, fontSize:'0.75rem', fontWeight:700, cursor:'default', border:'none', fontFamily:'inherit', background:'rgba(16,185,129,0.1)', color:'#34d399' },
}

export default function ShareModal({ post, onClose }) {
  const { user } = useAuth()
  const [sentTo, setSentTo] = useState(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['follows'],
    queryFn: () => authFetch('/api/follows').then(r => r.json()),
  })

  const shareMutation = useMutation({
    mutationFn: async (partnerId) => {
      const res = await authFetch('/api/share', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, partner_id: partnerId })
      })
      if (!res.ok) throw new Error(await res.text())
      return partnerId
    },
    onSuccess: (partnerId) => {
      setSentTo(prev => new Set(prev).add(partnerId))
      toast.success('Movie shared!')
    },
    onError: () => toast.error('Failed to share')
  })

  let partners = []
  if (data) {
    const { users = [], sent = [], received = [] } = data
    const sentMap = Object.fromEntries(sent.map(s => [s.following_id, s]))
    const recMap  = Object.fromEntries(received.map(r => [r.follower_id, r]))
    partners = users.filter(u => sentMap[u.id]?.status === 'accepted' || recMap[u.id]?.status === 'accepted')
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <motion.div style={S.overlay} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div onClick={onClose} style={S.backdrop} />
      <motion.div style={S.modal}
        initial={{ scale:0.95, y:20, opacity:0 }}
        animate={{ scale:1, y:0, opacity:1 }}
        exit={{ scale:0.95, y:20, opacity:0 }}
      >
        <div style={S.header}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.125rem', fontWeight:800, color:'#e2e8f0' }}>Share Movie</h2>
            <p style={{ margin:'2px 0 0', fontSize:'0.8125rem', color:'#64748b' }}>Send to a partner's watchlist</p>
          </div>
          <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        </div>

        <div style={S.body}>
          {isLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}><LoadingSpinner size="md" /></div>
          ) : partners.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
              <p style={{ fontSize:'2rem', margin:'0 0 0.5rem' }}>👥</p>
              <h3 style={{ margin:0, color:'#e2e8f0', fontSize:'1rem' }}>No partners yet</h3>
              <p style={{ color:'#64748b', fontSize:'0.8125rem', margin:'0.5rem 0 0' }}>Add friends to share movies directly to their watchlist!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {partners.map(p => {
                const isSent = sentTo.has(p.id)
                return (
                  <div key={p.id} style={S.userRow}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar user={p} size={32} />
                      <div style={{ fontSize:'0.875rem', fontWeight:600, color:'#e2e8f0' }}>{p.name}</div>
                    </div>
                    {isSent ? (
                      <button style={S.sentBtn}>Sent ✅</button>
                    ) : (
                      <button 
                        onClick={() => shareMutation.mutate(p.id)} 
                        disabled={shareMutation.isPending && shareMutation.variables === p.id}
                        style={S.sendBtn}
                      >
                        {shareMutation.isPending && shareMutation.variables === p.id ? <LoadingSpinner size="sm"/> : <Send size={12}/>} Send
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
