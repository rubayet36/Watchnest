'use client'

export const OFFLINE_DRAFTS_KEY = 'watchnest-offline-post-drafts'
export const OFFLINE_DRAFTS_EVENT = 'watchnest-offline-drafts'

export function readOfflineDrafts() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(OFFLINE_DRAFTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function writeOfflineDrafts(drafts) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts))
  window.dispatchEvent(new Event(OFFLINE_DRAFTS_EVENT))
}

export function saveOfflinePostDraft(payload) {
  const draft = {
    id: crypto.randomUUID(),
    payload,
    createdAt: Date.now(),
  }
  writeOfflineDrafts([draft, ...readOfflineDrafts()])
  return draft
}

export function removeOfflineDraft(id) {
  writeOfflineDrafts(readOfflineDrafts().filter((draft) => draft.id !== id))
}
