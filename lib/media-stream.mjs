// Embed origins verified against provider responses/docs on 2026-10-30.
export const STREAM_SOURCES = [
  { id: 'videasy', label: 'Videasy', origin: 'https://player.videasy.to', prefix: '' },
  { id: 'vidsrc', label: 'VidSrc', origin: 'https://vidsrc.sh', prefix: '/embed' },
  { id: '2embed', label: '2Embed', origin: 'https://2embed.stream', prefix: '/embed' },
]
const positive = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))

export function buildMediaStreamUrl({ sourceId, mediaType, tmdbId, season, episode }) {
  const source = STREAM_SOURCES.find(item => item.id === sourceId)
  if (!source || !['movie', 'tv'].includes(mediaType) || !positive(tmdbId)) return null
  if (mediaType === 'tv' && (!positive(season) || !positive(episode))) return null
  const path = `${source.prefix}/${mediaType}/${tmdbId}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`
  return new URL(path, source.origin).href
}

export function availableSeasons(seasons) {
  return (Array.isArray(seasons) ? seasons : [])
    .filter(item => Number.isInteger(item?.season_number) && item.season_number > 0 && Number.isInteger(item.episode_count) && item.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)
}

export function restoreEpisodeProgress(raw, seasons) {
  const fallback = { season: seasons[0]?.season_number || 1, episode: 1 }
  try {
    const saved = JSON.parse(raw)
    const season = seasons.find(item => item.season_number === saved?.season)
    if (!season || !positive(saved.episode)) return fallback
    return { season: season.season_number, episode: Math.min(Number(saved.episode), season.episode_count) }
  } catch { return fallback }
}
