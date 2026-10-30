import { resolveAnimeStream } from '@/lib/anime-stream.mjs'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const GOGO_BASE = 'https://anineko.to'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

function decodeHtmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
}

export async function GET(request, { params }) {
  try {
    const { path = [] } = await params
    const endpoint = path[0]
    const url = new URL(request.url)

    if (endpoint === 'search') {
      const query = url.searchParams.get('query')
      const page = url.searchParams.get('page') || '1'
      if (!query) return NextResponse.json({ results: [] })

      const res = await fetch(`${GOGO_BASE}/browser?keyword=${encodeURIComponent(query)}&page=${page}`, { headers })
      const html = await res.text()

      // Parse search results
      const results = []
      const regex = /<a class="nv-anime-thumb nv-browse-thumb" href="\/watch\/([^"]+)">\s*<img src="([^"]+)" alt="([^"]+)"/g
      let match
      while ((match = regex.exec(html)) !== null) {
        results.push({
          id: match[1],
          title: decodeHtmlEntities(match[3]),
          image: match[2],
        })
      }
      return NextResponse.json({ results })
    }

    if (endpoint === 'info') {
      const animeId = url.searchParams.get('id')
      if (!animeId) return NextResponse.json({ error: 'Anime ID is required' }, { status: 400 })

      // Fetch main info page
      const res = await fetch(`${GOGO_BASE}/watch/${animeId}`, { headers })
      if (!res.ok) return NextResponse.json({ error: 'Anime not found' }, { status: 404 })
      const html = await res.text()

      // Extract details
      const titleMatch = html.match(/<h1 class="nv-info-title">([^<]+)<\/h1>/) || html.match(/<h1>([^<]+)<\/h1>/)
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''

      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/<div class="nv-info-bg" style="background-image:[^']+'([^']+)'/)
      const image = imageMatch ? imageMatch[1].trim() : ''

      const synopsisMatch = html.match(/<meta name="description" content="([^"]+)"/)
      const synopsis = synopsisMatch ? decodeHtmlEntities(synopsisMatch[1].trim()) : ''

      const episodes = []
      // Match href="/watch/{animeId}/ep-{epNum}"
      const escapedAnimeId = animeId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      const epRegex = new RegExp(`href="\\/watch\\/${escapedAnimeId}\\/ep-(\\d+)"`, 'g')
      let epMatch
      while ((epMatch = epRegex.exec(html)) !== null) {
        const epNum = parseInt(epMatch[1])
        if (!episodes.some(e => e.episodeNumber === epNum)) {
          episodes.push({
            id: `${animeId}~ep-${epNum}`,
            episodeNumber: epNum,
          })
        }
      }

      // Sort episodes ascending
      episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)

      return NextResponse.json({
        id: animeId,
        title,
        image,
        synopsis,
        genres: [], // Let the frontend use AniList genres since they are richer
        episodes,
      })
    }

    if (endpoint === 'watch') {
      const { status, body } = await resolveAnimeStream(url.searchParams)
      return NextResponse.json(body, { status })
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
