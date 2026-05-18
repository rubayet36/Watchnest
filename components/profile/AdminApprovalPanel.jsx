'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import Avatar from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

async function fetchAdminUsers() {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await authFetch('/api/admin/users', { signal: controller.signal, timeoutMs: 8_000 })
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
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
    retry: false,
    staleTime: 15_000,
  })

  const approveUser = useMutation({
    mutationFn: async ({ userId, approved }) => {
      const res = await authFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, approved }),
      })
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
    <section className="admin-approval-panel glass-panel">
      <div className="admin-approval-head">
        <div>
          <p className="page-kicker">Admin</p>
          <h2>Approve users</h2>
        </div>
        <span><ShieldCheck size={14} /> {pending.length} pending</span>
      </div>

      {isLoading ? (
        <div className="admin-approval-state"><LoadingSpinner size="md" /><span>Loading approval queue...</span></div>
      ) : isError ? (
        <div className="admin-approval-state">{error?.message || 'Could not load approval queue.'}</div>
      ) : (
        <div className="admin-approval-list">
          {visibleUsers.map(user => {
            const busy = approveUser.isPending && approveUser.variables?.userId === user.id
            return (
              <div key={user.id} className="admin-approval-row">
                <Avatar user={user} size={38} />
                <div className="admin-approval-copy">
                  <strong>{user.name || user.username || user.email || 'User'}</strong>
                  <span>{user.email || `@${user.username}`}</span>
                </div>
                <span className={`admin-approval-status ${user.approved ? 'is-approved' : ''}`}>
                  {user.approved ? <CheckCircle size={13} /> : <UserX size={13} />}
                  {user.approved ? 'Approved' : 'Pending'}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className={user.approved ? 'admin-approval-action is-muted' : 'admin-approval-action'}
                  onClick={() => approveUser.mutate({ userId: user.id, approved: !user.approved })}
                >
                  {busy ? <LoadingSpinner size="sm" /> : user.approved ? <UserX size={14} /> : <UserCheck size={14} />}
                  <span>{user.approved ? 'Revoke' : 'Approve'}</span>
                </button>
              </div>
            )
          })}
          {visibleUsers.length === 0 && (
            <div className="admin-approval-state">
              No regular users yet. New signups will appear here after they create an account.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
