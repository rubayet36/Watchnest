// Provider lookup runs on the server; browsers only receive validated embed URLs.
export async function resolveAnimeStream(params, fetcher = fetch) {
  const anilistId = params.get('anilistId')
  const episode = params.get('ep') || '1'
  const malId = params.get('malId')
  const language = params.get('language') || 'sub'
  const positiveInteger = value => /^[1-9]\d*$/.test(value || '') && Number.isSafeInteger(Number(value))
  if (!positiveInteger(anilistId) || !positiveInteger(episode) || (malId && !positiveInteger(malId)) || !['sub', 'dub'].includes(language)) {
    return { status: 400, body: { error: 'A valid AniList ID, episode and sub/dub language are required.' } }
  }
  try {
    const base = process.env.ANIME_STREAM_API_BASE || 'https://reanime.to'
    const url = new URL(`/api/flix/${anilistId}/${episode}`, base)
    if (malId) url.searchParams.set('mal', malId)
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('Provider unavailable')
    const data = await response.json()
    if (data.success !== true || !Array.isArray(data.servers)) throw new Error('Invalid provider response')
    const seen = new Set()
    const servers = data.servers.flatMap(server => {
      if (!server || ![language, `s-${language}`].includes(server.dataType)) return []
      try {
        const embed = new URL(server.dataLink)
        if (embed.protocol !== 'https:' || embed.hostname !== 'flixcloud.cc' || !embed.pathname.startsWith('/e/') || embed.username || embed.password) return []
        if (seen.has(embed.href)) return []
        seen.add(embed.href)
        return [{ name: typeof server.serverName === 'string' ? server.serverName : 'Stream', url: embed.href, language }]
      } catch { return [] }
    })
    return { status: 200, body: { servers, language, ...(servers.length ? {} : { message: `No ${language} servers are available for this episode.` }) } }
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error.name)
    return { status: timeout ? 504 : 502, body: { error: timeout ? 'The streaming provider timed out. Please retry.' : 'The streaming provider is unavailable. Please retry later.' } }
  }
}

export function animeEpisodeInfo(media) {
  if (!media) return null
  // Upcoming totals are not evidence that an episode has aired.
  const lastAired = media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : null
  const count = media.status === 'NOT_YET_RELEASED' ? 0 : lastAired ?? (media.status === 'FINISHED' ? media.episodes : 1)
  return {
    title: media.title?.english || media.title?.romaji || 'Anime',
    image: media.coverImage?.large || '',
    episodes: Array.from({ length: Math.min(Math.max(count || 0, 0), 10000) }, (_, i) => ({ id: `${media.id}~ep-${i + 1}`, episodeNumber: i + 1 })),
  }
}
