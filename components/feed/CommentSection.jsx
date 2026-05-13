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
  const queryClient = useQueryClient()

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const res = await authFetch(`/api/comments?post_id=${post.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load comments')
      return data.comments ?? []
    },
  })

  const addComment = useMutation({
    mutationFn: async (text) => {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, content: text })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] })
    },
    onError: (err) => toast.error('Failed to post comment')
  })

  const deleteComment = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', post.id] }),
    onError: () => toast.error('Failed to delete comment')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim() || addComment.isPending) return
    addComment.mutate(content)
  }

  return (
    <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', maxHeight: 300, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'1rem' }}><LoadingSpinner size="sm"/></div>
        ) : !comments || comments.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', padding: '0.5rem' }}>No comments yet. Be the first!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '0.5rem', group: 'comment' }}>
              <Avatar user={c.profiles} size={28} />
              <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: '0 12px 12px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>{c.profiles?.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{timeAgo(c.created_at)}</div>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#cbd5e1', marginTop: 2, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {c.content}
                </div>
              </div>
              {user?.id === c.user_id && (
                <button
                  onClick={() => { if(window.confirm('Delete comment?')) deleteComment.mutate(c.id) }}
                  style={{ background:'none', border:'none', color:'#f43f5e', cursor:'pointer', padding:'0.25rem', opacity: 0.6, transition:'opacity .2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '0.5rem 1rem', color: '#e2e8f0', fontSize: '0.8125rem',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || addComment.isPending}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: content.trim() ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.1)',
            color: 'white', cursor: content.trim() ? 'pointer' : 'default',
            transition: 'background .2s', flexShrink: 0
          }}
        >
          {addComment.isPending ? <LoadingSpinner size="sm" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  )
}
