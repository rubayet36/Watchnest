'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authFetch } from '@/lib/auth-fetch'
import { OFFLINE_DRAFTS_EVENT, readOfflineDrafts, removeOfflineDraft } from '@/lib/offline-drafts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function OfflineDraftsTray() {
  const [drafts, setDrafts] = useState([])
  const [syncingId, setSyncingId] = useState(null)
  const [online, setOnline] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    const refresh = () => {
      setDrafts(readOfflineDrafts())
      setOnline(navigator.onLine)
    }
    refresh()
    window.addEventListener(OFFLINE_DRAFTS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.removeEventListener(OFFLINE_DRAFTS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])

  const syncDraft = async (draft) => {
    if (!online) {
      toast.error('You are still offline')
      return
    }

    setSyncingId(draft.id)
    try {
      const res = await authFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(draft.payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to sync draft')
      removeOfflineDraft(draft.id)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Draft posted')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSyncingId(null)
    }
  }

  if (drafts.length === 0) return null

  return (
    <section className="offline-drafts glass-panel" aria-label="Offline drafts">
      <div className="offline-drafts-header">
        <div>
          <p className="offline-drafts-kicker"><CloudOff size={14} /> Offline drafts</p>
          <h2>{drafts.length} waiting to sync</h2>
        </div>
        <span>{online ? 'Online' : 'Offline'}</span>
      </div>

      <div className="offline-drafts-list">
        {drafts.map((draft) => (
          <article key={draft.id} className="offline-draft-row">
            <div>
              <strong>{draft.payload?.title || 'Untitled'}</strong>
              <p>{draft.payload?.personal_note || draft.payload?.why_watch || 'No note added yet'}</p>
            </div>
            <div className="offline-draft-actions">
              <button
                type="button"
                onClick={() => syncDraft(draft)}
                disabled={syncingId === draft.id || !online}
                aria-label={`Sync ${draft.payload?.title || 'draft'}`}
              >
                {syncingId === draft.id ? <LoadingSpinner size="sm" /> : <RefreshCcw size={15} />}
              </button>
              <button
                type="button"
                onClick={() => removeOfflineDraft(draft.id)}
                aria-label={`Delete ${draft.payload?.title || 'draft'}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
