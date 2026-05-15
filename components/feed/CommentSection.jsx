'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authFetch } from '@/lib/auth-fetch'
import Avatar from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'
import { timeAgo } from '@/lib/utils'

export default function CommentSection({ post }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyTexts, setReplyTexts] = useState({})
  const queryClient = useQueryClient()
  const queryKey = ['comments', post.id]

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await authFetch(`/api/comments?post_id=${post.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      return (data.comments ?? []).map((comment) => ({ ...comment, replies: comment.replies || [] }))
    },
    retry: false,
  })

  const addComment = useMutation({
    mutationFn: async (text) => {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, content: text }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => toast.error('Failed to post comment'),
  })

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
      setReplyTexts((current) => ({ ...current, [parentId]: '' }))
      setReplyingTo(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => toast.error('Failed to post reply'),
  })

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

  return (
    <section className="feed-comments">
      <div className="feed-comments-list">
        {isLoading ? (
          <div className="feed-comments-loading">
            <LoadingSpinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <p className="feed-comments-empty">No comments yet. Be the first.</p>
        ) : comments.map((comment) => (
          <div key={comment.id} className="feed-comment-group">
            <div className="feed-comment">
              <Avatar user={comment.profiles} size={28} />
              <div className="feed-comment-bubble">
                <div className="feed-comment-top">
                  <span className="feed-user-name">{comment.profiles?.name}</span>
                  <span>{timeAgo(comment.created_at)}</span>
                </div>
                <p className="feed-comment-text">{comment.content}</p>
              </div>
              {user?.id === comment.user_id && (
                <button
                  type="button"
                  onClick={() => { if (window.confirm('Delete?')) deleteComment.mutate(comment.id) }}
                  className="feed-delete-button"
                  aria-label="Delete comment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="feed-reply-controls">
              <button
                type="button"
                className={`feed-reply-button ${replyingTo?.commentId === comment.id ? 'is-active' : ''}`}
                onClick={() => setReplyingTo(
                  replyingTo?.commentId === comment.id ? null : { commentId: comment.id, name: comment.profiles?.name }
                )}
              >
                {replyingTo?.commentId === comment.id ? 'Cancel' : `Reply${comment.replies?.length > 0 ? ` (${comment.replies.length})` : ''}`}
              </button>
            </div>

            {comment.replies?.length > 0 && (
              <div className="feed-replies">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="feed-comment feed-reply">
                    <Avatar user={reply.profiles} size={22} />
                    <div className="feed-comment-bubble feed-reply-bubble">
                      <div className="feed-comment-top">
                        <span className="feed-user-name">{reply.profiles?.name}</span>
                        <span>{timeAgo(reply.created_at)}</span>
                      </div>
                      <p className="feed-comment-text">{reply.content}</p>
                    </div>
                    {user?.id === reply.user_id && (
                      <button
                        type="button"
                        onClick={() => { if (window.confirm('Delete?')) deleteComment.mutate(reply.id) }}
                        className="feed-delete-button"
                        aria-label="Delete reply"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {replyingTo?.commentId === comment.id && (
              <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="feed-comment-form feed-reply-form">
                <input
                  type="text"
                  autoFocus
                  value={replyTexts[comment.id] || ''}
                  onChange={(e) => setReplyTexts((current) => ({ ...current, [comment.id]: e.target.value }))}
                  placeholder={`Reply to ${replyingTo.name}...`}
                  className="feed-comment-input"
                />
                <button type="submit" className="feed-comment-send" disabled={!(replyTexts[comment.id] || '').trim() || addReply.isPending}>
                  {addReply.isPending ? <LoadingSpinner size="sm" /> : <Send size={13} />}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="feed-comment-form">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="feed-comment-input"
        />
        <button type="submit" className="feed-comment-send" disabled={!content.trim() || addComment.isPending}>
          {addComment.isPending ? <LoadingSpinner size="sm" /> : <Send size={14} />}
        </button>
      </form>
    </section>
  )
}
