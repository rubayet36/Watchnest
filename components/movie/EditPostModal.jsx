'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronDown, Save, Trash2 } from 'lucide-react'
import { CATEGORIES } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const S = {
  overlay:  { position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
  backdrop: { position:'absolute', inset:0, background:'rgba(5,5,15,0.75)' },
  modal:    { position:'relative', zIndex:10, width:'100%', maxWidth:480, background:'rgba(18,18,32,0.97)', backdropFilter:'blur(24px)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:24, overflow:'visible' },
  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)' },
  body:     { padding:'1.25rem 1.5rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' },
  label:    { display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#94a3b8', marginBottom:6 },
  textarea: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.75rem 1rem', color:'#e2e8f0', fontFamily:'inherit', fontSize:'0.9375rem', outline:'none', resize:'none', boxSizing:'border-box' },
  submitBtn:{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.875rem', background:'linear-gradient(135deg,#7c3aed,#db2777)', border:'none', borderRadius:14, cursor:'pointer', color:'white', fontWeight:700, fontSize:'0.9375rem', fontFamily:'inherit', transition:'opacity .2s' },
  cancelBtn:{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.875rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, cursor:'pointer', color:'#e2e8f0', fontWeight:600, fontSize:'0.9375rem', fontFamily:'inherit', transition:'background .2s' },
  deleteBtn:{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0.875rem', background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:14, cursor:'pointer', color:'#f43f5e', transition:'background .2s' },
  closeBtn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.375rem', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' },
}

export default function EditPostModal({ post, onClose }) {
  const [note, setNote] = useState(post.review || '')
  const [category, setCategory] = useState(post.category || CATEGORIES[0].id)
  const [catOpen, setCatOpen] = useState(false)
  const queryClient = useQueryClient()

  const submitEdit = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category, review: note.trim() || null })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      toast.success('Post updated!')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', post.user_id] })
      onClose()
    },
    onError: (err) => {
      toast.error('Failed to update post: ' + err.message)
    }
  })

  const deletePost = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      toast.success('Post deleted')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', post.user_id] })
      onClose()
    },
    onError: (err) => {
      toast.error('Failed to delete post: ' + err.message)
    }
  })

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
            <h2 style={{ margin:0, fontSize:'1.125rem', fontWeight:800, color:'#e2e8f0' }}>Edit Post</h2>
            <p style={{ margin:'2px 0 0', fontSize:'0.8125rem', color:'#64748b' }}>{post.title}</p>
          </div>
          <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        </div>

        <div style={S.body}>
          {/* Category Dropdown */}
          <div style={{ position:'relative' }}>
            <label style={S.label}>Category</label>
            <button onClick={() => setCatOpen(!catOpen)} style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'0.875rem 1rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:12, color:'#e2e8f0', fontSize:'0.9375rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {(() => {
                  const c = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]
                  return <><span style={{fontSize:'1.1rem'}}>{c.icon}</span> {c.label}</>
                })()}
              </div>
              <ChevronDown size={18} style={{ color:'#64748b', transform: catOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div
                  initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:4 }} exit={{ opacity:0, y:-10 }}
                  style={{
                    position:'absolute', top:'100%', left:0, right:0, zIndex:20,
                    background:'rgba(20,20,35,0.95)', backdropFilter:'blur(24px)', border:'1px solid rgba(139,92,246,0.3)',
                    borderRadius:12, padding:'0.5rem', boxShadow:'0 10px 40px rgba(0,0,0,0.5)',
                    display:'flex', flexDirection:'column', gap:4
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <button key={cat.id}
                      onClick={() => { setCategory(cat.id); setCatOpen(false) }}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'0.625rem 0.75rem',
                        background: category === cat.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                        border:'none', borderRadius:8, cursor:'pointer', color:'#e2e8f0', fontSize:'0.875rem', fontWeight:600, fontFamily:'inherit', textAlign:'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = category === cat.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = category === cat.id ? 'rgba(139,92,246,0.15)' : 'transparent'}
                    >
                      <span style={{fontSize:'1.1rem'}}>{cat.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ color: category === cat.id ? '#a78bfa' : '#e2e8f0' }}>{cat.label}</div>
                        <div style={{ fontSize:'0.7rem', color:'#64748b', fontWeight:400, marginTop:2 }}>{cat.desc}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Note */}
          <div>
            <label style={S.label}>Your Review / Notes</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What did you think of it?"
              style={{ ...S.textarea, height:120 }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={onClose}
              style={S.cancelBtn}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this post? This cannot be undone.")) {
                  deletePost.mutate()
                }
              }}
              disabled={deletePost.isPending || submitEdit.isPending}
              style={{ ...S.deleteBtn, opacity: deletePost.isPending ? 0.5 : 1 }}
              title="Delete post"
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
            >
              {deletePost.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={18} />}
            </button>
            <button
              onClick={() => submitEdit.mutate()}
              disabled={submitEdit.isPending || deletePost.isPending}
              style={{ ...S.submitBtn, opacity: submitEdit.isPending ? 0.7 : 1 }}
            >
              {submitEdit.isPending ? <LoadingSpinner size="sm" /> : <><Save size={18} /> Save</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
