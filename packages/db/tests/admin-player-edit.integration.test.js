// Runs only against the explicitly selected disposable database, never a shared project.
vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.invalid/player-photo.png' } }),
        remove: async () => ({ error: null }),
      }),
    },
  }),
}))
const providerState = vi.hoisted(() => ({
  email: 'juan.fictional@example.com',
  reject: false,
  passwords: [],
}))
vi.mock('../src/auth/supabase-provider-admin.ts', () => ({
  supabaseProviderAdmin: () => ({
    readLogin: async () => ({ email: providerState.email, phoneE164: null }),
    updateLogin: async ({ email }) => {
      if (providerState.reject) throw new Error('unavailable')
      providerState.email = email
    },
  }),
  setPlayerPasswordByAdmin: async (_subject, password) => {
    if (providerState.reject) throw new Error('unavailable')
    providerState.passwords.push(password)
  },
}))

import { adminPlayerEditValuesOf } from '@rotra/data/admin-player/rules'
import { saveAdminPlayer } from '../src/admin/player-edit'
import { readAdminPlayerEdit } from '../src/admin/players'
import { prisma } from '../src/client/prisma'

const playerId = '91000000-0000-4000-8000-000000000001'
const context = {
  kind: 'admin',
  adminId: 'ad000000-0000-4000-8000-000000000001',
  subject: 'fictional',
}

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://example.invalid'
  process.env.SUPABASE_SECRET_KEY = 'fictional-test-key'
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

test('saves the full registered player edit and supersedes the previous phone request', async () => {
  const original = await readAdminPlayerEdit(context, playerId)
  const values = {
    ...adminPlayerEditValuesOf({ ...original, revision: Number(original.revision) }),
    picture:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAACW0lEQVR4nO3OQQkAQBDEsPFv+s7DfkqhEAHZ25IzfhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhA1fhC1DxwqeGLAr8TfAAAAAElFTkSuQmCC',
    name: 'Juan Example',
    nickname: 'J',
    playingStyle: 'Attacking',
    experienceYears: '2',
    experienceMonths: '3',
    facebook: 'https://facebook.com/fictional',
    profilePrivate: true,
    phoneHidden: true,
    phone: '+639175550199',
    email: 'new.fictional@example.com',
    password: 'fictional-password',
    reason: 'Fictional integration check',
  }
  const result = await saveAdminPlayer(context, { playerId, revision: original.revision, values })
  expect(result.warnings).toEqual([])
  expect(result.changed).toEqual(
    expect.arrayContaining(['profile picture', 'name', 'phone', 'email', 'password']),
  )
  const saved = await readAdminPlayerEdit(context, playerId)
  expect(saved.name).toBe('Juan Example')
  expect(saved.picture).toBe('https://example.invalid/player-photo.png')
  expect(saved.playingStyle).toBe('Attacking')
  expect(saved.profilePrivate).toBe(true)
  expect(saved.phoneHidden).toBe(true)
  expect(saved.phone).toBe('+639175550199')
  expect(saved.email).toBe('new.fictional@example.com')
  expect(saved.socialLinks.facebook).toBe('https://facebook.com/fictional')
  expect(saved.passwordSetAt).not.toBeNull()
  const request = await prisma.playerContactChangeRequest.findUniqueOrThrow({
    where: { id: 'cc000000-0000-4000-8000-000000000001' },
  })
  expect(request.status).toBe('rejected')
  expect(request.supersededAt).not.toBeNull()
  const audit = await prisma.adminAuditEvent.findMany({ where: { targetId: playerId } })
  expect(JSON.stringify(audit)).not.toContain('fictional-password')
})

test('saves profile changes and reports unconfirmed Auth changes', async () => {
  const original = await readAdminPlayerEdit(context, playerId)
  providerState.reject = true
  const values = {
    ...adminPlayerEditValuesOf({ ...original, revision: Number(original.revision) }),
    name: 'Juan After Failure',
    email: 'retry.fictional@example.com',
    password: 'another-fictional-password',
    reason: 'Provider failure check',
  }
  const result = await saveAdminPlayer(context, { playerId, revision: original.revision, values })
  expect(result.changed).toContain('name')
  expect(result.changed).not.toContain('email')
  expect(result.changed).not.toContain('password')
  expect(result.warnings).toHaveLength(2)
  const saved = await readAdminPlayerEdit(context, playerId)
  expect(saved.name).toBe('Juan After Failure')
  expect(saved.email).toBe('new.fictional@example.com')
  const pending = await prisma.adminPlayerEmailEdit.findFirst({
    where: { playerId, state: 'pending' },
  })
  expect(pending?.proposedEmail).toBe('retry.fictional@example.com')
})

test('reconciles an unconfirmed email change on retry', async () => {
  providerState.reject = false
  const original = await readAdminPlayerEdit(context, playerId)
  const values = {
    ...adminPlayerEditValuesOf({ ...original, revision: Number(original.revision) }),
    email: 'retry.fictional@example.com',
    reason: 'Retry provider change',
  }
  const result = await saveAdminPlayer(context, { playerId, revision: original.revision, values })
  expect(result.warnings).toEqual([])
  expect(result.changed).toContain('email')
  expect((await readAdminPlayerEdit(context, playerId)).email).toBe('retry.fictional@example.com')
  expect(await prisma.adminPlayerEmailEdit.count({ where: { playerId, state: 'pending' } })).toBe(0)
})

test('a staged email remains reserved against other player contact writes', async () => {
  const contact = await prisma.playerPrivateContact.findUniqueOrThrow({ where: { playerId } })
  const operation = await prisma.adminPlayerEmailEdit.create({
    data: {
      playerId,
      adminId: context.adminId,
      originalEmail: contact.email,
      proposedEmail: 'reserved.fictional@example.com',
      contactRevision: contact.revision,
    },
  })
  await expect(
    prisma.playerPrivateContact.update({
      where: { playerId: '91000000-0000-4000-8000-000000000003' },
      data: { email: 'reserved.fictional@example.com' },
    }),
  ).rejects.toThrow()
  await prisma.adminPlayerEmailEdit.update({
    where: { id: operation.id },
    data: { state: 'failed' },
  })
})

test('rejects a stale revision without saving fields', async () => {
  const original = await readAdminPlayerEdit(context, playerId)
  const values = {
    ...adminPlayerEditValuesOf({ ...original, revision: Number(original.revision) }),
    name: 'Stale edit',
    reason: 'Stale check',
  }
  await expect(saveAdminPlayer(context, { playerId, revision: '0', values })).rejects.toMatchObject(
    { code: 'conflict' },
  )
  expect((await readAdminPlayerEdit(context, playerId)).name).toBe(original.name)
})
