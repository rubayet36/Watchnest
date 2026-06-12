export function getWatchHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('watch_history') || '[]'
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (e) {
    console.error('Error reading watch history:', e)
    return []
  }
}

export function addToWatchHistory(item) {
  if (typeof window === 'undefined') return
  try {
    const list = getWatchHistory()
    
    // Filter out existing item to place the most recent one at the top
    const filtered = list.filter(
      (h) => !(String(h.id) === String(item.id) && h.media_type === item.media_type)
    )
    
    const newItem = {
      id: item.id,
      title: item.title,
      poster_path: item.poster_path,
      media_type: item.media_type,
      last_watched_at: new Date().toISOString(),
      progress: item.progress || {}
    }
    
    filtered.unshift(newItem)
    
    // Limit history length to 50 items
    const limited = filtered.slice(0, 50)
    localStorage.setItem('watch_history', JSON.stringify(limited))
  } catch (e) {
    console.error('Error adding to watch history:', e)
  }
}

export function removeFromWatchHistory(id, mediaType) {
  if (typeof window === 'undefined') return
  try {
    const list = getWatchHistory()
    const filtered = list.filter(
      (h) => !(String(h.id) === String(id) && h.media_type === mediaType)
    )
    localStorage.setItem('watch_history', JSON.stringify(filtered))
  } catch (e) {
    console.error('Error removing from watch history:', e)
  }
}

export function clearWatchHistory() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('watch_history')
  } catch (e) {
    console.error('Error clearing watch history:', e)
  }
}
