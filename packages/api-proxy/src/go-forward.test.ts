import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { isMovedPath } from './go-forward.ts'

const before = process.env.ROTRA_GO_MOVED_AREAS
afterEach(() => {
  if (before === undefined) delete process.env.ROTRA_GO_MOVED_AREAS
  else process.env.ROTRA_GO_MOVED_AREAS = before
})
const areas = (value: string) => {
  process.env.ROTRA_GO_MOVED_AREAS = value
}

test('a plain entry moves the whole-segment prefix', () => {
  areas('/api/auth, /api/claim/')
  assert.equal(isMovedPath('/api/auth'), true)
  assert.equal(isMovedPath('/api/auth/google/start'), true)
  assert.equal(isMovedPath('/api/claim/abc/google'), true)
  assert.equal(isMovedPath('/api/authors'), false)
  assert.equal(isMovedPath('/api/register'), false)
})

test('nothing moves with no entries', () => {
  areas('')
  assert.equal(isMovedPath('/api/auth'), false)
})

test('an = entry matches one exact path, with * for exactly one segment', () => {
  areas('=/api/register/*/google')
  assert.equal(isMovedPath('/api/register/club-1/google'), true)
  assert.equal(isMovedPath('/api/register/club-1/google/'), true)
  // The Admin-link routes stay where they are.
  assert.equal(isMovedPath('/api/register'), false)
  assert.equal(isMovedPath('/api/register/google'), false)
  // Same segment count but not the same literal; deeper; or an empty segment.
  assert.equal(isMovedPath('/api/register/club-1/facebook'), false)
  assert.equal(isMovedPath('/api/register/club-1/google/extra'), false)
  assert.equal(isMovedPath('/api/register//google'), false)
})

test('an = entry never acts as a prefix', () => {
  areas('=/api/auth/google/start')
  assert.equal(isMovedPath('/api/auth/google/start'), true)
  assert.equal(isMovedPath('/api/auth/google/start/more'), false)
  assert.equal(isMovedPath('/api/auth/google'), false)
})

test('plain and = entries can be mixed, and a malformed entry moves nothing', () => {
  areas('/api/auth,=/api/register/*/google,=,=no-slash,nonsense')
  assert.equal(isMovedPath('/api/auth/sign-in'), true)
  assert.equal(isMovedPath('/api/register/c/google'), true)
  assert.equal(isMovedPath('/api/other'), false)
})
