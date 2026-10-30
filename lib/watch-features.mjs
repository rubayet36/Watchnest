export const REPORT_REASONS = ['not_playing', 'wrong_episode', 'no_audio', 'subtitles', 'buffering']
export function validId(value) { return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) }
export function validateReport(body) {
  if (!body || !['movie','tv','anime'].includes(body.media_type) || !validId(body.media_id) || !REPORT_REASONS.includes(body.reason)) return null
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.provider !== 'string' || !body.provider.trim() || body.provider.length > 50) return null
  const season = body.season ?? 0, episode = body.episode ?? 0
  if ((body.media_type==='movie' && (season!==0 || episode!==0)) || (body.media_type==='tv' && (season<1 || episode<1)) || (body.media_type==='anime' && episode<1)) return null
  if (![season,episode].every(v => Number.isInteger(v) && v >= 0 && v < 100000)) return null
  return { media_type: body.media_type, media_id: Number(body.media_id), title: body.title.trim(), provider: body.provider.trim(), season, episode, reason: body.reason }
}
export function summarizeReports(rows) {
  const providers = {}, titles = {}
  for (const row of rows) {
    providers[row.provider] = (providers[row.provider] || 0) + 1
    const key = `${row.media_type}:${row.media_id}`
    titles[key] ??= { title: row.title, count: 0 }; titles[key].count++
  }
  return { providers: Object.entries(providers).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count), titles: Object.values(titles).sort((a,b)=>b.count-a.count) }
}
export function resumeUrl(item) {
  const p = item.progress || {}
  if (item.media_type === 'anime') return p.episodeId ? `/anime/watch/${encodeURIComponent(p.episodeId)}?${new URLSearchParams({ anilistId: String(item.id), ep: String(p.epNum || 1), language: p.language || 'sub' })}` : `/anime/${item.id}`
  return `/media/${item.media_type}/${item.id}?${new URLSearchParams({ watch: '1', ...(item.media_type === 'tv' ? { season: String(p.season || 1), episode: String(p.episode || 1) } : {}) })}`
}
export function mergeProgress(previous = {}, incoming = {}) {
  const changed = ['season','episode','epNum'].some(key => incoming[key] !== undefined && previous[key] !== undefined && String(incoming[key]) !== String(previous[key]))
  return { ...(changed ? {} : previous), ...incoming }
}
export function progressPercent(progress) {
  return Number.isFinite(progress?.currentTime) && progress?.duration > 0 ? Math.min(100, Math.max(0, progress.currentTime / progress.duration * 100)) : null
}
// Accept only documented VidSrc events from the selected iframe and matching title.
export function parsePlayerProgress(event, frameWindow, origin, identity) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== origin) return null
  let payload = event.data
  try { if (typeof payload === 'string') payload = JSON.parse(payload) } catch { return null }
  if (payload?.type !== 'PLAYER_EVENT') return null
  const d = payload.data, info = d?.player_info
  if (!info || String(info.tmdb) !== String(identity.tmdbId) || info.mediaType !== identity.mediaType) return null
  if (identity.mediaType === 'tv' && (Number(info.season) !== Number(identity.season) || Number(info.episode) !== Number(identity.episode))) return null
  if (!['playing','paused','seeked','completed'].includes(d.player_status) || !Number.isFinite(d.player_progress) || !Number.isFinite(d.player_duration) || d.player_duration <= 0 || d.player_progress < 0 || d.player_progress > d.player_duration + 5) return null
  return { currentTime: Math.min(d.player_progress,d.player_duration), duration: d.player_duration, completed: d.player_status === 'completed' }
}
export function releaseStatus(date, status, today = new Date().toISOString().slice(0,10)) {
  return status === 'NOT_YET_RELEASED' || (date && date > today) ? 'Upcoming' : 'Sources checked when you press play'
}
