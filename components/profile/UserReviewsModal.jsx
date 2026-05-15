'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, MessageCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { timeAgo } from '@/lib/utils'

const S = {
  overlay:  { position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
  backdrop: { position:'absolute', inset:0, background:'rgba(5,5,15,0.75)' },
  modal:    { position:'relative', zIndex:10, width:'100%', maxWidth:500, maxHeight:'90dvh', display:'flex', flexDirection:'column', background:'rgba(18,18,32,0.97)', backdropFilter:'blur(24px)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:24 },
  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)' },
  body:     { padding:'1.25rem 1.5rem', overflowY:'auto', display:'flex', flexDirection:'column', gap:'1rem' },
  closeBtn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.375rem', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' },
  textarea: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.75rem 1rem', color:'#e2e8f0', fontFamily:'inherit', fontSize:'0.9375rem', outline:'none', resize:'none', boxSizing:'border-box', marginTop:8 },
  submitBtn:{ display:'flex', alignItems:'center', gap:6, padding:'0.6rem 1rem', background:'linear-gradient(135deg,#7c3aed,#db2777)', border:'none', borderRadius:10, cursor:'pointer', color:'white', fontWeight:700, fontSize:'0.875rem', fontFamily:'inherit', transition:'opacity .2s', alignSelf:'flex-end', marginTop:8 },
}

export default function UserReviewsModal({ profile, onClose }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', profile.id],
    queryFn: () => fetch(`/api/reviews?user=${profile.id}`).then(r => r.json()),
  })

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ reviewee_id: profile.id, rating, review_text: reviewText })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.review
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', profile.id])
      toast.success('Review added!')
      setRating(0)
      setReviewText('')
    },
    onError: e => toast.error(e.message)
  })

  const reviews = data?.reviews || []
  const hasReviewed = user && reviews.some(r => r.reviewer?.id === user.id)
  const canReview = user && user.id !== profile.id && !hasReviewed

  return (
    <motion.div style={S.overlay} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div onClick={onClose} style={S.backdrop} />
      <motion.div style={S.modal}
        initial={{ scale:0.95, y:20, opacity:0 }}
        animate={{ scale:1, y:0, opacity:1 }}
        exit={{ scale:0.95, y:20, opacity:0 }}
      >
        <div style={S.header}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.125rem', fontWeight:800, color:'#e2e8f0' }}>Reviews for {profile.name}</h2>
            <p style={{ margin:'2px 0 0', fontSize:'0.8125rem', color:'#64748b' }}>What others think of their movie taste</p>
          </div>
          <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        </div>

        <div style={S.body}>
          {canReview && (
            <div style={{ background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', padding:'1rem', borderRadius:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:'0.875rem', fontWeight:700, color:'#c4b5fd' }}>Rate {profile.name}&apos;s recommendations</p>
              <div style={{ display:'flex', gap:4 }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star} type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background:'none', border:'none', padding:0, cursor:'pointer' }}
                  >
                    <Star size={24} fill={(hoverRating || rating) >= star ? '#fbbf24' : 'transparent'} color={(hoverRating || rating) >= star ? '#fbbf24' : '#64748b'} />
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {rating > 0 && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={`Say something nice about ${profile.name}'s taste...`} style={S.textarea} rows={3} />
                    <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} style={{...S.submitBtn, opacity: submitReview.isPending ? 0.5 : 1}}>
                      {submitReview.isPending ? <LoadingSpinner size="sm"/> : <MessageCircle size={14}/>} Submit Review
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}><LoadingSpinner size="md" /></div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>⭐</div>
              <h3 style={{ color:'#e2e8f0', margin:'0 0 0.5rem', fontWeight:600 }}>No reviews yet</h3>
              <p style={{ color:'#64748b', margin:0, fontSize:'0.875rem' }}>Be the first to rate {profile.name}&apos;s movie taste!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1rem' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Avatar user={r.reviewer} size={28} />
                      <div>
                        <div style={{ fontSize:'0.8125rem', fontWeight:700, color:'#e2e8f0' }}>{r.reviewer?.name}</div>
                        <div style={{ fontSize:'0.6875rem', color:'#64748b' }}>{timeAgo(r.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:2 }}>
                      {[1,2,3,4,5].map(star => <Star key={star} size={12} fill={r.rating >= star ? '#fbbf24' : 'transparent'} color={r.rating >= star ? '#fbbf24' : '#475569'} />)}
                    </div>
                  </div>
                  {r.review_text && <p style={{ margin:0, fontSize:'0.875rem', color:'#94a3b8', lineHeight:1.5 }}>&quot;{r.review_text}&quot;</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
