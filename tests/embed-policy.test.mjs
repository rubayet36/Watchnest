import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iframeSandbox } from '../lib/embed-policy.mjs'

test('Videasy movie and TV embeds omit sandbox', () => {
  for (const path of ['/movie/155', '/tv/1399/1/1']) {
    assert.equal(iframeSandbox(`https://player.videasy.to${path}`), undefined)
  }
})

test('other providers and lookalike origins retain sandbox restrictions', () => {
  for (const url of ['https://vidsrc.sh/embed/movie/155', 'https://2embed.stream/embed/movie/155',
    'https://flixcloud.cc/e/test', 'https://player.videasy.to.evil.test/movie/155',
    'http://player.videasy.to/movie/155', 'https://player.videasy.to:444/movie/155',
    'https://user:password@player.videasy.to/movie/155', '', 'invalid']) {
    assert.equal(iframeSandbox(url), 'allow-scripts allow-same-origin allow-forms allow-presentation')
  }
})
