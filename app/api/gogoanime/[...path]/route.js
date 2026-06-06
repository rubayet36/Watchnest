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
      const episodeId = url.searchParams.get('episodeId')
      const anilistId = url.searchParams.get('anilistId')
      const malId = url.searchParams.get('malId')
      const episodeNum = url.searchParams.get('ep') || '1'

      if (!episodeId) return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 })

      const realPath = episodeId.includes('~') ? 'watch/' + episodeId.replace('~', '/') : episodeId
      const res = await fetch(`${GOGO_BASE}/${realPath}`, { headers })
      if (!res.ok) return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      const html = await res.text()

      // Extract default player iframe (if any)
      let primaryIframe = html.match(/<iframe src="([^"]+)"/)?.[1]
      if (primaryIframe && primaryIframe.startsWith('//')) {
        primaryIframe = `https:${primaryIframe}`
      }

      const servers = []

      // 1. Selena / PRI
      if (anilistId) {
        servers.push({
          name: 'Selena / PRI',
          url: `https://enma.lol/embed/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 2. Cipher
      if (anilistId) {
        servers.push({
          name: 'Cipher',
          url: `https://hianime.ms/embed/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 3. Oracle
      if (anilistId) {
        servers.push({
          name: 'Oracle',
          url: `https://miruro.tv/watch/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 4. Aegis HD-1
      if (malId) {
        servers.push({
          name: 'Aegis HD-1',
          url: `https://vidsrc.dev/embed/anime/${malId}/${episodeNum}`,
        })
      }

      // 5. Aegis HD-2
      if (anilistId) {
        servers.push({
          name: 'Aegis HD-2',
          url: `https://aniplay.to/embed/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 6. Nova
      if (anilistId) {
        servers.push({
          name: 'Nova',
          url: `https://zoroxtv.com/embed/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 7. Onyx
      if (anilistId) {
        servers.push({
          name: 'Onyx',
          url: `https://dropfile.cc/embed/anime/${anilistId}/${episodeNum}`,
        })
      }

      // 8. Gogoanime Native
      if (primaryIframe) {
        servers.push({
          name: 'Gogoanime Native',
          url: primaryIframe,
        })
      }

      // Parse other servers from the buttons
      const serverRegex = /<button[^>]*class="[^"]*nv-server-btn[^"]*"[^>]*data-video="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g
      let serverMatch
      while ((serverMatch = serverRegex.exec(html)) !== null) {
        let serverUrl = serverMatch[1]
        let serverText = serverMatch[2]

        // Clean server name
        let serverName = serverText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

        if (serverUrl) {
          if (serverUrl.startsWith('//')) {
            serverUrl = `https:${serverUrl}`
          }

          servers.push({
            name: serverName || 'Alternative Stream',
            url: serverUrl,
          })
        }
      }

      return NextResponse.json({
        episodeId,
        servers,
      })
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
