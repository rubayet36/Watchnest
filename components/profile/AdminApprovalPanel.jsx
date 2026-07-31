'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ShieldCheck, UserCheck, UserX, Clock, ShieldAlert } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

function withTimeout(promise, message, timeoutMs = 8_000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer))
}

async function fetchAdminUsers() {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await withTimeout(
      fetch('/api/admin/users', { signal: controller.signal }),
      'Approval queue request timed out'
    )
    window.clearTimeout(timer)

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load users')
    return data.users || []
  } catch (error) {
    window.clearTimeout(timer)
    if (error?.name === 'AbortError') throw new Error('Approval queue request timed out')
    throw error
  }
}

export default function AdminApprovalPanel() {
  const queryClient = useQueryClient()
  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
    retry: false,
    staleTime: 15_000,
  })

  const approveUser = useMutation({
    mutationFn: async ({ userId, approved }) => {
      const res = await withTimeout(
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, approved }),
        }),
        'Approval update timed out'
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      return data.user
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const pending = users.filter(user => user.account_type !== 'admin' && !user.approved)
  const approved = users.filter(user => user.account_type !== 'admin' && user.approved)
  const visibleUsers = [...pending, ...approved]

  return (
    <section style={{
      background: '#15171C',
      border: '1px solid rgba(232, 178, 61, 0.3)',
      borderRadius: '20px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
    }}>
      {/* Admin Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 800, color: '#E8B23D', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
            — ADMIN CONTROL PANEL
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', color: '#F2EFE9', letterSpacing: '0.03em', lineHeight: 1 }}>
            USER APPROVAL QUEUE
          </h2>
        </div>
        
        <div style={{
          padding: '4px 10px', borderRadius: '8px',
          background: 'rgba(232, 178, 61, 0.14)', border: '1px solid rgba(232, 178, 61, 0.35)',
          color: '#E8B23D', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 5
        }}>
          <ShieldCheck size={14} />
          {pending.length} PENDING
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '2rem 0', color: '#9A9CA3', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
          <LoadingSpinner size="md" />
          <span>Loading approval queue...</span>
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#FF6A3D', fontFamily: "'Manrope', sans-serif", fontSize: '0.85rem' }}>
          {error?.message || 'Could not load approval queue.'}
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              display: 'block', margin: '0.75rem auto 0', padding: '0.4rem 1rem', borderRadius: 8,
              background: 'rgba(255, 106, 61, 0.15)', border: '1px solid #FF6A3D', color: '#FF6A3D',
              fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleUsers.map(u => {
            const busy = approveUser.isPending && approveUser.variables?.userId === u.id
            const isUserApproved = u.approved

            return (
              <div
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  padding: '0.85rem 1rem', borderRadius: '14px', background: '#0D0E12',
                  border: isUserApproved ? '1px solid rgba(63, 221, 168, 0.2)' : '1px solid rgba(232, 178, 61, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                  <Avatar user={u} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F2EFE9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || u.username || u.email || 'User'}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#9A9CA3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email || `@${u.username}`}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  padding: '3px 8px', borderRadius: '6px',
                  background: isUserApproved ? 'rgba(63, 221, 168, 0.14)' : 'rgba(232, 178, 61, 0.14)',
                  border: isUserApproved ? '1px solid rgba(63, 221, 168, 0.3)' : '1px solid rgba(232, 178, 61, 0.3)',
                  color: isUserApproved ? '#3FDDA8' : '#E8B23D',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {isUserApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {isUserApproved ? 'APPROVED' : 'PENDING'}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => approveUser.mutate({ userId: u.id, approved: !u.approved })}
                  style={{
                    padding: '0.45rem 0.95rem', borderRadius: '10px', cursor: 'pointer',
                    background: isUserApproved ? 'rgba(255, 255, 255, 0.06)' : 'linear-gradient(135deg, #FF7D4D, #FF6A3D)',
                    border: isUserApproved ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                    color: isUserApproved ? '#9A9CA3' : '#1a0a04',
                    fontSize: '0.78rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                    display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {busy ? (
                    <LoadingSpinner size="sm" />
                  ) : isUserApproved ? (
                    <><UserX size={13} /> Revoke</>
                  ) : (
                    <><UserCheck size={13} /> Approve</>
                  )}
                </button>
              </div>
            )
          })}

          {visibleUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9A9CA3', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
              No user approval requests in queue.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
