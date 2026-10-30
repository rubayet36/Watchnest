import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STREAM_SOURCES, buildMediaStreamUrl, availableSeasons, restoreEpisodeProgress } from '../lib/media-stream.mjs'

test('all movie providers use verified origins and TMDB movie routes', () => {
  for (const source of STREAM_SOURCES) {
    const url = new URL(buildMediaStreamUrl({ sourceId: source.id, mediaType: 'movie', tmdbId: '550' }))
    assert.equal(url.origin, source.origin)
    assert.equal(url.pathname, `${source.prefix}/movie/550`)
  }
})
test('TV links preserve season and episode for every provider', () => {
  for (const source of STREAM_SOURCES) {
    const url = buildMediaStreamUrl({ sourceId: source.id, mediaType: 'tv', tmdbId: 1399, season: 2, episode: 3 })
    assert.equal(url, `${source.origin}${source.prefix}/tv/1399/2/3`)
  }
})
test('invalid media types, IDs and episodes never become embeds', () => {
  const base = { sourceId: 'videasy', mediaType: 'tv', tmdbId: 1399, season: 1, episode: 1 }
  for (const changes of [{ sourceId: 'unknown' }, { mediaType: 'anime' }, { tmdbId: '../550' }, { season: 0 }, { episode: -1 }, { episode: NaN }, { episode: null }]) {
    assert.equal(buildMediaStreamUrl({ ...base, ...changes }), null)
  }
})
test('season guide does not invent entries and excludes specials and empty seasons', () => {
  assert.deepEqual(availableSeasons(null), [])
  assert.deepEqual(availableSeasons([]), [])
  const list = [{ season_number: 2, episode_count: 8 }, { season_number: 0, episode_count: 3 }, { season_number: 1, episode_count: 10 }, { season_number: 3, episode_count: 0 }]
  assert.deepEqual(availableSeasons(list).map(s => s.season_number), [1, 2])
  assert.equal(list[0].season_number, 2)
})
test('resume preserves valid progress and clamps beyond the season end', () => {
  const seasons = [{ season_number: 1, episode_count: 10 }, { season_number: 2, episode_count: 8 }]
  assert.deepEqual(restoreEpisodeProgress('{"season":2,"episode":4}', seasons), { season: 2, episode: 4 })
  assert.deepEqual(restoreEpisodeProgress('{"season":2,"episode":99}', seasons), { season: 2, episode: 8 })
  for (const raw of ['invalid', null, '{"season":99,"episode":1}', '{"season":1,"episode":-2}']) {
    assert.deepEqual(restoreEpisodeProgress(raw, seasons), { season: 1, episode: 1 })
  }
})
