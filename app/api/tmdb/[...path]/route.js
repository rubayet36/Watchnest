import { NextResponse } from 'next/server'

export const runtime = 'edge'

const TMDB_BASE = process.env.TMDB_BASE_URL || process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY

export async function GET(request, { params }) {
  try {
    if (!TMDB_API_KEY) {
      return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 })
    }

    const { path = [] } = await params
    const endpoint = `/${path.map(encodeURIComponent).join('/')}`
    const incoming = new URL(request.url)
    const tmdbUrl = new URL(`${TMDB_BASE}${endpoint}`)

    tmdbUrl.searchParams.set('api_key', TMDB_API_KEY)
    incoming.searchParams.forEach((value, key) => {
      if (key !== 'api_key') tmdbUrl.searchParams.set(key, value)
    })

    const response = await fetch(tmdbUrl.toString(), {
      next: { revalidate: 60 * 60 },
      headers: { accept: 'application/json' },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.status_message || `TMDB error: ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
