'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'

export function useReactions(postId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const toggleReaction = useMutation({
    mutationFn: async (reactionType) => {
      if (!user) throw new Error('Not authenticated')
      const res  = await authFetch('/api/reactions', { method: 'POST', body: JSON.stringify({ post_id: postId, reaction_type: reactionType }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Reaction failed')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['moviePosts'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return {
    toggleReaction: toggleReaction.mutate,
    isReacting: toggleReaction.isPending,
  }
}

export function useWatchlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const toggleSave = useMutation({
    mutationFn: async (postId) => {
      if (!user) throw new Error('Not authenticated')
      const res  = await authFetch('/api/saves', { method: 'POST', body: JSON.stringify({ post_id: postId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      return json
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      if (data.saved) {
        toast.success('Added to watchlist ✓')
      } else {
        toast('Removed from watchlist', {
          icon: '🗑️',
          style: { background: '#1c1c2e', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' },
        })
      }
    },
    onError: (e) => toast.error(e.message),
  })

  return {
    toggleSave: toggleSave.mutate,
    isSaving: toggleSave.isPending,
  }
}
