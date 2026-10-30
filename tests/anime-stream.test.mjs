import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAnimeStream, animeEpisodeInfo } from '../lib/anime-stream.mjs'
const params = extra => new URLSearchParams({ anilistId: '97821', ep: '1', ...extra })
const response = servers => async () => Response.json({ success: true, servers })
const sub = { serverName: 'HD-1', dataLink: 'https://flixcloud.cc/e/example?v=1', dataType: 'sub' }
test('uses AniList ID and optional MAL ID, normalizes and deduplicates servers', async () => {
  const result = await resolveAnimeStream(params({ malId: '34350' }), async (url) => {
    assert.equal(url.pathname, '/api/flix/97821/1')
    assert.equal(url.searchParams.get('mal'), '34350')
    return Response.json({ success: true, servers: [sub, sub] })
  })
  assert.equal(result.status, 200)
  assert.equal(result.body.servers.length, 1)
  assert.equal(result.body.servers[0].url, sub.dataLink)
})
test('filters sub and dub independently', async () => {
  const result = await resolveAnimeStream(params({ language: 'dub' }), response([sub, { ...sub, dataType: 's-dub' }]))
  assert.equal(result.body.servers.length, 1)
  assert.equal(result.body.servers[0].language, 'dub')
})
test('rejects invalid identifiers before contacting provider', async () => {
  for (const values of [{ anilistId: '' }, { ep: '-1' }, { ep: '1/2' }, { malId: 'abc' }, { language: 'invalid' }]) {
    const result = await resolveAnimeStream(params(values), () => assert.fail('must not fetch'))
    assert.equal(result.status, 400)
  }
})
test('rejects unsafe and unrelated embed URLs', async () => {
  const result = await resolveAnimeStream(params(), response(['javascript:alert(1)', 'http://flixcloud.cc/e/test', 'https://evil.test/e/test', 'https://flixcloud.cc.evil.test/e/test'].map(dataLink => ({ ...sub, dataLink }))))
  assert.deepEqual(result.body.servers, [])
})
test('reports no servers without inventing a fallback', async () => {
  const result = await resolveAnimeStream(params(), response([]))
  assert.equal(result.status, 200)
  assert.match(result.body.message, /No sub servers/)
})
test('handles provider failures and malformed payloads', async () => {
  for (const fetcher of [async () => new Response('', { status: 403 }), async () => Response.json({ success: false }), async () => new Response('<html>')]) {
    assert.equal((await resolveAnimeStream(params(), fetcher)).status, 502)
  }
})
test('reports timeout separately', async () => {
  const result = await resolveAnimeStream(params(), async () => { throw new DOMException('timeout', 'TimeoutError') })
  assert.equal(result.status, 504)
})
test('episode guide excludes future episodes and uses stable AniList links', () => {
  const media = { id: 21, status: 'RELEASING', episodes: 100, nextAiringEpisode: { episode: 5 } }
  assert.equal(animeEpisodeInfo(media).episodes.length, 4)
  assert.equal(animeEpisodeInfo(media).episodes[0].id, '21~ep-1')
  assert.equal(animeEpisodeInfo({ ...media, status: 'NOT_YET_RELEASED' }).episodes.length, 0)
  assert.equal(animeEpisodeInfo({ id: 21, status: 'FINISHED', episodes: 12 }).episodes.length, 12)
  assert.equal(animeEpisodeInfo(null), null)
})
