// Only the fictional fixtures in a local disposable database may be used here.
vi.mock('server-only', () => ({}))

import { readAdminPlayerGames } from '../src/admin/players'
import { prisma } from '../src/client/prisma'

const admin = {
  kind: 'admin',
  adminId: 'ad000000-0000-4000-8000-000000000001',
  subject: 'fictional',
}
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid')
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !url.pathname.startsWith('/rotra_disposable')
  )
    throw new Error('Refusing to run outside a local disposable database')
})
afterAll(async () => {
  await prisma.$disconnect()
})

test('unclaimed record returns its own finalized game, without merging a same-named player', async () => {
  const sessions = await readAdminPlayerGames(admin, 'cb000000-0000-4000-8000-0000000000a2')
  expect(sessions).toHaveLength(1)
  expect(sessions[0].title).toBe('Tuesday Doubles')
  expect(sessions[0].games).toHaveLength(1)
  expect(sessions[0].games[0]).toMatchObject({ result: 'won', counting: 'counted' })
})

test('unclaimed record with no finalized games returns an empty history', async () => {
  expect(await readAdminPlayerGames(admin, 'cb000000-0000-4000-8000-0000000000a5')).toEqual([])
})

test('unknown player remains not found and a non-admin is denied', async () => {
  await expect(
    readAdminPlayerGames(admin, '00000000-0000-4000-8000-000000000001'),
  ).rejects.toMatchObject({ code: 'not_found' })
  await expect(
    readAdminPlayerGames({ kind: 'player' }, 'cb000000-0000-4000-8000-0000000000a2'),
  ).rejects.toMatchObject({ code: 'wrong_account' })
})

test('registered player history is retained', async () => {
  const sessions = await readAdminPlayerGames(admin, '91000000-0000-4000-8000-000000000001')
  expect(sessions).toHaveLength(1)
  expect(sessions[0].games).toHaveLength(1)
})
