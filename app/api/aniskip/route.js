import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const malId = url.searchParams.get('malId')
    const episode = url.searchParams.get('episode')

    if (!malId || !episode) {
      return NextResponse.json({ error: 'malId and episode are required' }, { status: 400 })
    }

    const length = url.searchParams.get('length') || '1440' // 24 minutes fallback

    // Query official AniSkip API
    const skipUrl = `https://api.aniskip.com/v1/skip-times/${malId}/${episode}?types[]=op&types[]=ed&episodeLength=${length}`
    const res = await fetch(skipUrl)

    if (!res.ok) {
      return NextResponse.json({ found: false, results: [] })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
