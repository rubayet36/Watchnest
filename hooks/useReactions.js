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

    onMutate: async (reactionType) => {
      if (!user) return

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      await queryClient.cancelQueries({ queryKey: ['moviePosts'] })

      // Snapshot current cache values for rollback
      const previousFeed      = queryClient.getQueriesData({ queryKey: ['feed'] })
      const previousMoviePosts = queryClient.getQueriesData({ queryKey: ['moviePosts'] })

      // Helper: update a post in whatever shape the cache holds it
      const patchPost = (post) => {
        if (post?.id !== postId) return post
        const reactions = post.reactions || []
        const existing = reactions.find(r => r.user_id === user.id && r.reaction_type === reactionType)
        if (existing) {
          return { ...post, reactions: reactions.filter(r => !(r.user_id === user.id && r.reaction_type === reactionType)) }
        }
        return { ...post, reactions: [...reactions.filter(r => r.user_id !== user.id), { user_id: user.id, reaction_type: reactionType }] }
      }

      // Patch paginated feed cache (array of pages, each with { posts: [] })
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old) => {
        if (!old) return old
        // Infinite query shape: { pages: [{ posts: [] }, ...] }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              posts: page.posts?.map(patchPost) ?? page.posts,
            })),
          }
        }
        // Flat shape: { posts: [] }
        if (old.posts) return { ...old, posts: old.posts.map(patchPost) }
        return old
      })

      // Patch movie-specific posts cache
      queryClient.setQueriesData({ queryKey: ['moviePosts'] }, (old) => {
        if (!old) return old
        if (old.pages) {
          return { ...old, pages: old.pages.map(page => ({ ...page, posts: page.posts?.map(patchPost) ?? page.posts })) }
        }
        if (old.posts) return { ...old, posts: old.posts.map(patchPost) }
        return old
      })

      return { previousFeed, previousMoviePosts }
    },

    onError: (e, _reactionType, context) => {
      // Roll back to the snapshots we saved in onMutate
      if (context?.previousFeed) {
        for (const [queryKey, data] of context.previousFeed) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      if (context?.previousMoviePosts) {
        for (const [queryKey, data] of context.previousMoviePosts) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error(e.message)
    },

    onSettled: () => {
      // Always sync with server after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['moviePosts'] })
    },
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
