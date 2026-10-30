import { test } from 'node:test'
import assert from 'node:assert/strict'
import { databaseFailure } from '../lib/service-errors.mjs'

test('distinguishes missing migration, permissions and missing server configuration', () => {
  for (const code of ['42P01', '42703', 'PGRST204', 'PGRST205']) {
    assert.equal(databaseFailure({ code }).code, 'DATABASE_SETUP_REQUIRED')
  }
  assert.equal(databaseFailure({ code: '42501' }).code, 'DATABASE_PERMISSION_DENIED')
  assert.equal(databaseFailure({ code: 'SERVER_CONFIG_MISSING' }).code, 'SERVER_CONFIG_MISSING')
})

test('unknown errors do not imply a missing migration or expose database details', () => {
  const result = databaseFailure({ code: 'XX000', message: 'private data', details: 'secret' })
  assert.equal(result.code, 'DATABASE_UNAVAILABLE')
  assert.doesNotMatch(JSON.stringify(result), /private|secret|XX000/)
  assert.equal(databaseFailure().code, 'DATABASE_UNAVAILABLE')
})
