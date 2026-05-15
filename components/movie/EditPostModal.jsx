'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Save, ShieldAlert, Star, Trash2, X } from 'lucide-react'
import { CATEGORIES } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const MOOD_TAGS = ['Cozy', 'Funny', 'Emotional', 'Mind-bending', 'Dark', 'Romantic', 'Hype', 'Rewatch']

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(5,5,15,0.75)', backdropFilter: 'blur(10px)' },
  modal: { position: 'relative', zIndex: 10, width: '100%', maxWidth: 520, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', borderRadius: 24, boxShadow: 'var(--soft-shadow)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--control-border)' },
  body: { padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 },
  textarea: { width: '100%', background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 12, padding: '0.75rem 1rem', color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.9375rem', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  submitBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.875rem', background: 'linear-gradient(135deg,#22d3ee,#8b5cf6 55%,#fb7185)', border: 'none', borderRadius: 14, cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: '0.9375rem', fontFamily: 'inherit' },
  cancelBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.875rem', background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 14, cursor: 'pointer', color: 'var(--text)', fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'inherit' },
  deleteBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 14, cursor: 'pointer', color: '#f43f5e' },
  closeBtn: { background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 10, padding: '0.375rem', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

export default function EditPostModal({ post, onClose }) {
  const [note, setNote] = useState(post.personal_note || post.review || '')
  const [whyWatch, setWhyWatch] = useState(post.why_watch || '')
  const [containsSpoilers, setContainsSpoilers] = useState(Boolean(post.contains_spoilers))
  const [moodTags, setMoodTags] = useState(Array.isArray(post.mood_tags) ? post.mood_tags : [])
  const [userRating, setUserRating] = useState(post.user_rating === null || post.user_rating === undefined ? '' : String(post.user_rating))
  const [category, setCategory] = useState(post.category || CATEGORIES[0].id)
  const [catOpen, setCatOpen] = useState(false)
  const queryClient = useQueryClient()

  const submitEdit = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category,
          personal_note: note.trim() || null,
          contains_spoilers: containsSpoilers,
          mood_tags: moodTags,
          user_rating: userRating === '' ? null : Number(userRating),
          why_watch: whyWatch.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to update post')
      return json
    },
    onSuccess: () => {
      toast.success('Post updated')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['posts', post.user_id] })
      queryClient.invalidateQueries({ queryKey: ['mediaPosts'] })
      onClose()
    },
    onError: (err) => {
      toast.error(`Failed to update post: ${err.message}`)
    },
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
      toast.error(`Failed to delete post: ${err.message}`)
    },
  })

  const toggleMoodTag = (tag) => {
    setMoodTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag].slice(0, 4)
    )
  }

  return (
    <motion.div style={S.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div onClick={onClose} style={S.backdrop} />
      <motion.div
        style={S.modal}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
      >
        <div style={S.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)' }}>Edit Post</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--muted)' }}>{post.title}</p>
          </div>
          <button type="button" onClick={onClose} style={S.closeBtn} aria-label="Close edit post modal"><X size={18} /></button>
        </div>

        <div style={S.body}>
          <div style={{ position: 'relative' }}>
            <label style={S.label}>Category</label>
            <button type="button" onClick={() => setCatOpen(!catOpen)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1rem', background: 'var(--control-bg)', border: '1px solid var(--control-border)',
              borderRadius: 12, color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <span>{CATEGORIES.find((c) => c.id === category)?.label || 'Select category'}</span>
              <ChevronDown size={18} style={{ color: 'var(--muted)', transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 4 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--glass-bg-strong)', backdropFilter: 'blur(24px)', border: '1px solid var(--accent-soft)', borderRadius: 12, padding: '0.5rem', boxShadow: 'var(--soft-shadow)', display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => { setCategory(cat.id); setCatOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.625rem 0.75rem', background: category === cat.id ? 'rgba(139,92,246,0.15)' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', textAlign: 'left' }}>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label style={S.label}>Your rating</label>
            <div className="review-rating-row">
              <Star size={16} />
              <input type="range" min="0" max="10" step="0.5" value={userRating === '' ? 0 : userRating} onChange={(e) => setUserRating(e.target.value)} aria-label="Your rating out of 10" />
              <strong>{userRating === '' ? 'Skip' : `${Number(userRating).toFixed(1)}/10`}</strong>
            </div>
          </div>

          <div>
            <label style={S.label}>Mood tags</label>
            <div className="mood-tag-row">
              {MOOD_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleMoodTag(tag)} className={`mood-tag ${moodTags.includes(tag) ? 'is-active' : ''}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <label className="spoiler-toggle">
            <input type="checkbox" checked={containsSpoilers} onChange={(e) => setContainsSpoilers(e.target.checked)} />
            <span><ShieldAlert size={15} /> This note contains spoilers</span>
          </label>

          <div>
            <label style={S.label}>Your Review / Notes</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you think of it?" style={{ ...S.textarea, height: 120 }} maxLength={500} />
          </div>

          <div>
            <label style={S.label}>Why should someone watch it?</label>
            <textarea value={whyWatch} onChange={(e) => setWhyWatch(e.target.value)} placeholder="A quick reason for your friends..." style={{ ...S.textarea, height: 90 }} maxLength={280} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} style={S.cancelBtn}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this post? This cannot be undone.')) deletePost.mutate()
              }}
              disabled={deletePost.isPending || submitEdit.isPending}
              style={{ ...S.deleteBtn, opacity: deletePost.isPending ? 0.5 : 1 }}
              title="Delete post"
            >
              {deletePost.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={18} />}
            </button>
            <button type="button" onClick={() => submitEdit.mutate()} disabled={submitEdit.isPending || deletePost.isPending} style={{ ...S.submitBtn, opacity: submitEdit.isPending ? 0.7 : 1 }}>
              {submitEdit.isPending ? <LoadingSpinner size="sm" /> : <><Save size={18} /> Save</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
