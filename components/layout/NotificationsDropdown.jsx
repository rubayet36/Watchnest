'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Share2, UserPlus, Star, MessageCircle, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/ui/Avatar'
import { authFetch } from '@/lib/auth-fetch'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authFetch('/api/notifications').then(r => r.json()),
    refetchInterval: 15000,
  })

  const markRead = useMutation({
    mutationFn: (id) => authFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify(id ? { notification_id: id } : { mark_all_read: true })
    }),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notifications = data?.notifications || []
  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type) => {
    switch(type) {
      case 'reaction': return <Heart size={14} color="#f43f5e" />
      case 'share': return <Share2 size={14} color="#3b82f6" />
      case 'follow_request': return <UserPlus size={14} color="#f59e0b" />
      case 'review': return <Star size={14} color="#fbbf24" />
      case 'comment': return <MessageCircle size={14} color="#10b981" />
      default: return <Bell size={14} color="#8b5cf6" />
    }
  }

  const getMessage = (n) => {
    const name = n.actor?.name || 'Someone'
    switch(n.type) {
      case 'reaction': return <>{name} reacted to your post <b>{n.post?.title}</b></>
      case 'share': return <>{name} shared <b>{n.post?.title}</b> with you</>
      case 'follow_request': return <>{name} sent you a partner request</>
      case 'review': return <>{name} reviewed your movie taste</>
      case 'comment': return <>{name} commented on your post <b>{n.post?.title}</b></>
      default: return <>{name} interacted with you</>
    }
  }

  const getLink = (n) => {
    switch(n.type) {
      case 'reaction':
      case 'comment': return `/media/${n.post?.media_type || 'movie'}/${n.post?.tmdb_id}`
      case 'share': return `/watchlist`
      case 'follow_request': return `/watchlist`
      case 'review': return `/profile/${n.actor?.id}`
      default: return '#'
    }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{
        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color:'#e2e8f0', position:'relative', transition:'background .2s',
      }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position:'absolute', top:-2, right:-2, background:'#f43f5e', color:'white',
            fontSize:'0.6rem', fontWeight:800, width:16, height:16, borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid rgba(12,12,24,1)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity:0, y:10, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:10, scale:0.95 }}
            transition={{ duration:0.15 }}
            style={{
              position:'absolute', top:'calc(100% + 8px)', right:0, width:320,
              background:'rgba(20,20,35,0.95)', backdropFilter:'blur(24px)',
              border:'1px solid rgba(139,92,246,0.3)', borderRadius:16,
              boxShadow:'0 10px 40px rgba(0,0,0,0.6)', overflow:'hidden', zIndex:100
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#e2e8f0' }}>Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={() => markRead.mutate()} style={{ background:'none', border:'none', fontSize:'0.75rem', color:'#a78bfa', cursor:'pointer', fontWeight:600 }}>
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {isLoading ? (
                <div style={{ padding:'2rem', textAlign:'center', color:'#64748b', fontSize:'0.875rem' }}>Loading...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding:'2.5rem 1rem', textAlign:'center' }}>
                  <Bell size={24} color="#475569" style={{ marginBottom:8 }} />
                  <p style={{ margin:0, color:'#94a3b8', fontSize:'0.875rem' }}>All caught up!</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => !n.read && markRead.mutate(n.id)} style={{
                    display:'flex', gap:'0.75rem', padding:'1rem', borderBottom:'1px solid rgba(255,255,255,0.03)',
                    background: n.read ? 'transparent' : 'rgba(124,58,237,0.08)', cursor:'pointer',
                    transition:'background .2s',
                  }}>
                    <Avatar user={n.actor} size={36} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <Link href={getLink(n)} onClick={() => setIsOpen(false)} style={{ textDecoration:'none', color:'#e2e8f0', fontSize:'0.8125rem', lineHeight:1.4, display:'block' }}>
                        {getMessage(n)}
                      </Link>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, fontSize:'0.7rem', color:'#64748b' }}>
                        {getIcon(n.type)}
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read && <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6', flexShrink:0, alignSelf:'center' }} />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
