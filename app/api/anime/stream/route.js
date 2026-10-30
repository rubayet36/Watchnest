import { NextResponse } from 'next/server'
import { resolveAnimeStream } from '@/lib/anime-stream.mjs'

export async function GET(request) {
  const { status, body } = await resolveAnimeStream(new URL(request.url).searchParams)
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
