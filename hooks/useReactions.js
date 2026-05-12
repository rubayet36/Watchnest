'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export function useReactions(postId) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const toggleReaction = useMutation({
    mutationFn: async (reactionType) => {
      if (!user) throw new Error('Not authenticated')

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .single()

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id)
      } else {
        // Remove old reaction from this user on this post
        await supabase.from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        await supabase.from('reactions').insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['movie'] })
    },
  })

  return { toggleReaction: toggleReaction.mutate }
}

export function useWatchlist() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const toggleSave = useMutation({
    mutationFn: async (postId) => {
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('saves')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase.from('saves').delete().eq('id', existing.id)
      } else {
        await supabase.from('saves').insert({ post_id: postId, user_id: user.id })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  return { toggleSave: toggleSave.mutate }
}
