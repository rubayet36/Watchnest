'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/auth-fetch'
import Avatar from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import { Trash2, Send } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

export default function CommentSection({ post }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null) // { commentId, name }
  const [replyTexts, setReplyTexts] = useState({})    // { commentId: text }
  const queryClient = useQueryClient()
  const queryKey = ['comments', post.id]

  // ── Fetch comments ────────────────────────────────────────
  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await authFetch(`/api/comments?post_id=${post.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      return (data.comments ?? []).map(c => ({ ...c, replies: c.replies || [] }))
    },
    retry: false,
  })

  // ── Post top-level comment ────────────────────────────────
  const addComment = useMutation({
    mutationFn: async (text) => {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, content: text }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => { setContent(''); queryClient.invalidateQueries({ queryKey }) },
    onError: () => toast.error('Failed to post comment'),
  })

  // ── Post reply ────────────────────────────────────────────
  const addReply = useMutation({
    mutationFn: async ({ text, parentId }) => {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, content: text, parent_id: parentId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (_, { parentId }) => {
      setReplyTexts(t => ({ ...t, [parentId]: '' }))
      setReplyingTo(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => toast.error('Failed to post reply'),
  })

  // ── Delete any comment or reply ───────────────────────────
  const deleteComment = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Failed to delete'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim() || addComment.isPending) return
    addComment.mutate(content)
  }

  const handleReplySubmit = (e, commentId) => {
    e.preventDefault()
    const text = replyTexts[commentId] || ''
    if (!text.trim() || addReply.isPending) return
    addReply.mutate({ text, parentId: commentId })
  }

  // ── Styles ────────────────────────────────────────────────
  const bubble = {
    flex: 1, minWidth: 0,
    background: 'rgba(255,255,255,0.04)',
    padding: '0.5rem 0.75rem',
    borderRadius: '0 12px 12px 12px',
  }
  const replyBubble = {
    flex: 1, minWidth: 0,
    background: 'rgba(139,92,246,0.06)',
    border: '1px solid rgba(139,92,246,0.12)',
    padding: '0.4rem 0.625rem',
    borderRadius: '0 10px 10px 10px',
  }
  const inputStyle = {
    flex: 1, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, padding: '0.5rem 1rem',
    color: '#e2e8f0', fontSize: '0.8125rem',
    outline: 'none', fontFamily: 'inherit',
  }
  const sendBtn = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
    background: active ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.08)',
    color: 'white', cursor: active ? 'pointer' : 'default', transition: 'background .2s',
  })
  const replyBtn = (active) => ({
    background: active ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 99, padding: '3px 12px',
    fontSize: '0.75rem', fontWeight: 600,
    color: active ? '#c4b5fd' : '#a78bfa',
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── Comments list ───────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '0.875rem', maxHeight: 420, overflowY: 'auto' }}>

        {isLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'1rem' }}>
            <LoadingSpinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <p style={{ textAlign:'center', fontSize:'0.8125rem', color:'#64748b', margin:0, padding:'0.5rem' }}>
            No comments yet. Be the first!
          </p>
        ) : comments.map(c => (
          <div key={c.id}>

            {/* ── Top-level comment ── */}
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start' }}>
              <Avatar user={c.profiles} size={28} />
              <div style={bubble}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#e2e8f0' }}>{c.profiles?.name}</span>
                  <span style={{ fontSize:'0.65rem', color:'#64748b' }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ margin:'4px 0 0', fontSize:'0.8125rem', color:'#cbd5e1', wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
                  {c.content}
                </p>
              </div>
              {user?.id === c.user_id && (
                <button
                  onClick={() => { if (window.confirm('Delete?')) deleteComment.mutate(c.id) }}
                  style={{ background:'none', border:'none', color:'#f43f5e', cursor:'pointer', padding:'0.25rem', opacity:0.5 }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* ── Reply button ── */}
            <div style={{ paddingLeft: '2.25rem', marginTop: '0.375rem' }}>
              <button
                style={replyBtn(replyingTo?.commentId === c.id)}
                onClick={() => setReplyingTo(
                  replyingTo?.commentId === c.id ? null : { commentId: c.id, name: c.profiles?.name }
                )}
              >
                ↩ {replyingTo?.commentId === c.id ? 'Cancel' : `Reply${c.replies?.length > 0 ? ` (${c.replies.length})` : ''}`}
              </button>
            </div>

            {/* ── Existing replies ── */}
            {c.replies?.length > 0 && (
              <div style={{ paddingLeft:'2.25rem', marginTop:'0.5rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {c.replies.map(r => (
                  <div key={r.id} style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start' }}>
                    <span style={{ color:'#475569', fontSize:12, marginTop:6 }}>↳</span>
                    <Avatar user={r.profiles} size={22} />
                    <div style={replyBubble}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#c4b5fd' }}>{r.profiles?.name}</span>
                        <span style={{ fontSize:'0.6rem', color:'#64748b' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      <p style={{ margin:'2px 0 0', fontSize:'0.78rem', color:'#cbd5e1', wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
                        {r.content}
                      </p>
                    </div>
                    {user?.id === r.user_id && (
                      <button
                        onClick={() => { if (window.confirm('Delete?')) deleteComment.mutate(r.id) }}
                        style={{ background:'none', border:'none', color:'#f43f5e', cursor:'pointer', padding:'0.2rem', opacity:0.5 }}
                        title="Delete reply"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Reply input ── */}
            {replyingTo?.commentId === c.id && (
              <form
                onSubmit={(e) => handleReplySubmit(e, c.id)}
                style={{ display:'flex', gap:'0.5rem', alignItems:'center', paddingLeft:'2.25rem', marginTop:'0.5rem' }}
              >
                <input
                  type="text"
                  autoFocus
                  value={replyTexts[c.id] || ''}
                  onChange={e => setReplyTexts(t => ({ ...t, [c.id]: e.target.value }))}
                  placeholder={`Reply to ${replyingTo.name}…`}
                  style={inputStyle}
                />
                <button type="submit" style={sendBtn(!!(replyTexts[c.id] || '').trim())} disabled={addReply.isPending}>
                  {addReply.isPending ? <LoadingSpinner size="sm" /> : <Send size={13} />}
                </button>
              </form>
            )}

          </div>
        ))}
      </div>

      {/* ── New top-level comment ─────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment…"
          style={inputStyle}
        />
        <button type="submit" style={sendBtn(!!content.trim())} disabled={!content.trim() || addComment.isPending}>
          {addComment.isPending ? <LoadingSpinner size="sm" /> : <Send size={14} />}
        </button>
      </form>

    </div>
  )
}
