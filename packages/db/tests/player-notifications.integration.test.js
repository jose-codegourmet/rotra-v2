// Run alone on a freshly migrated local rotra_disposable* database seeded with fictional.sql.
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/client/prisma'
import { setAdminVerificationOverride } from '../src/player/account-verification'
import { reviewContactChange, submitOwnContactChange } from '../src/player/contact-change'
import { leaveMyClub } from '../src/player/my-clubs'
import {
  countUnreadPlayerNotifications,
  listPlayerNotifications,
  markPlayerNotificationsRead,
} from '../src/player/notifications'
import { retryProjectionJob, runProjectionJobs } from '../src/player/projections'
import { joinSessionAsPlayer } from '../src/queue/public-session'
import { publishResults } from '../src/queue/results'
import { confirmJoinRequest, giveSlot, removeRosterPlayer } from '../src/queue/session-roster'

vi.mock('server-only', () => ({}))

const maria = { kind: 'player', playerId: '91000000-0000-4000-8000-000000000003' }
const juan = { kind: 'player', playerId: '91000000-0000-4000-8000-000000000001' }
const club = { kind: 'club', clubId: 'c1000000-0000-4000-8000-00000000000a' }
const admin = { kind: 'admin', adminId: 'ad000000-0000-4000-8000-000000000001' }
const upcoming = '5e000000-0000-4000-8000-0000000000a3'
const finished = '5e000000-0000-4000-8000-0000000000a1'
const slug = 'next-tuesday-a3'
const reminder = 'ann-google'
const DAY = 86_400_000

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid')
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !url.pathname.startsWith('/rotra_disposable')
  )
    throw new Error('Select a freshly seeded local disposable database.')
  await prisma.clubEntitlement.update({
    where: { clubId: club.clubId },
    data: { effectiveAccessEndsAt: new Date(Date.now() + DAY) },
  })
})
afterAll(() => prisma.$disconnect())

test('a confirmed request, promotion and direct join notify the right players once', async () => {
  const request = await joinSessionAsPlayer(maria, slug, { placement: 'waitlist' })
  const confirm = {
    operationId: randomUUID(),
    requestId: request.requestId,
    level: 'intermediate_mid',
  }
  const placed = await confirmJoinRequest(club, confirm)
  await confirmJoinRequest(club, confirm)
  const slot = { operationId: randomUUID(), waitlistId: placed.waitlist.id }
  await giveSlot(club, upcoming, slot)
  await giveSlot(club, upcoming, slot)

  const rows = (await listPlayerNotifications(maria)).filter((row) => !row.pinned)
  expect(rows).toHaveLength(3)
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'club', target: `/clubs/${club.clubId}` }),
      expect.objectContaining({
        title: "You're on the waitlist for Next Tuesday",
        body: `You're number ${placed.waitlist.position}. We'll tell you if a spot opens.`,
      }),
      expect.objectContaining({
        title: "You're in Next Tuesday",
        target: `/players/${maria.playerId}/sessions`,
      }),
    ]),
  )
  // 0: the seeded player_google_sign_in flag is off, so no verification reminder (D-2026-11-18-01).
  expect(await countUnreadPlayerNotifications(juan)).toBe(0)
  await expect(markPlayerNotificationsRead(juan, rows[0].id)).rejects.toMatchObject({
    code: 'not_found',
  })

  // A member with an existing level can join directly. No join request is involved.
  await removeRosterPlayer(club, upcoming, 'e1000000-0000-4000-8000-0000000a3001')
  expect((await joinSessionAsPlayer(juan, slug)).requestId).toBeNull()
  expect((await listPlayerNotifications(juan)).map((row) => row.title)).toContain(
    "You're in Next Tuesday",
  )

  await leaveMyClub(maria, club.clubId)
  expect((await listPlayerNotifications(maria)).find((row) => row.kind === 'club').target).toBe(
    `/players/${maria.playerId}`,
  )
})

test('a publication and a replayed rank job notify the confirmed history owners once', async () => {
  const command = { commandId: randomUUID(), slides: ['awards'] }
  await publishResults(club, finished, command)
  await publishResults(club, finished, command)
  for (const player of [juan, maria]) {
    const results = (await listPlayerNotifications(player)).filter((row) =>
      row.title.startsWith('Results are up'),
    )
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      body: 'You played 1 game. See how they counted.',
      target: `/players/${player.playerId}/games`,
    })
  }

  const jobId = 'b0000000-0000-4000-8000-000000000001'
  for (let attempt = 0; attempt < 2; attempt++) {
    // Reproduce a replay of the same source job using the existing failed-job retry command.
    await prisma.projectionJob.update({
      where: { id: jobId },
      data: { status: 'failed', completedAt: null },
    })
    await retryProjectionJob(jobId)
    const jobs = await runProjectionJobs(10, new Date(Date.now() + 1000), { sessionId: finished })
    expect(jobs).toContainEqual({ id: jobId, kind: 'player_rank', status: 'done' })
  }
  expect((await listPlayerNotifications(juan)).filter((row) => row.kind === 'rank')).toHaveLength(1)
  expect((await listPlayerNotifications(maria)).filter((row) => row.kind === 'rank')).toHaveLength(
    0,
  )
})

test('no verification reminder while Google sign-in for players is off (D-2026-11-18-01)', async () => {
  await prisma.featureFlag.update({
    where: { key: 'player_google_sign_in' },
    data: { value: false },
  })
  expect((await listPlayerNotifications(maria)).find((row) => row.pinned)).toBeUndefined()
})

test('Admin review reports the decision and verification replaces the pinned reminder', async () => {
  await prisma.featureFlag.update({
    where: { key: 'player_google_sign_in' },
    data: { value: true },
  })
  const approved = await submitOwnContactChange(maria, {
    commandId: randomUUID(),
    field: 'email',
    value: 'fixture-change@example.invalid',
  })
  for (let attempt = 0; attempt < 2; attempt++) {
    await reviewContactChange(admin, { requestId: approved.id, decision: 'approve' })
    await reviewContactChange(admin, {
      requestId: 'cc000000-0000-4000-8000-000000000001',
      decision: 'reject',
    })
  }
  expect(
    (await listPlayerNotifications(maria)).filter((row) => row.kind === 'account'),
  ).toMatchObject([
    { title: 'Your email change was approved', body: 'ROTRA Admin approved the change.' },
  ])
  expect(
    (await listPlayerNotifications(juan)).filter((row) => row.kind === 'account'),
  ).toMatchObject([{ title: 'Your phone number change was declined' }])

  await markPlayerNotificationsRead(maria, reminder)
  const pinned = (await listPlayerNotifications(maria)).find((row) => row.pinned)
  expect(pinned.readAt).toEqual(expect.any(String))
  await markPlayerNotificationsRead(maria, reminder)
  expect((await listPlayerNotifications(maria)).find((row) => row.pinned).readAt).toBe(
    pinned.readAt,
  )
  const { revision } = await prisma.player.findUniqueOrThrow({ where: { id: maria.playerId } })
  const override = {
    playerId: maria.playerId,
    verifiedByAdmin: true,
    reason: 'Fictional confirmation',
  }
  const verified = await setAdminVerificationOverride(admin, {
    ...override,
    revision: String(revision),
  })
  await setAdminVerificationOverride(admin, { ...override, revision: verified.revision })
  const rows = await listPlayerNotifications(maria)
  expect(rows.some((row) => row.pinned)).toBe(false)
  expect(rows.filter((row) => row.title === 'ROTRA Admin verified your account')).toHaveLength(1)
  expect(await prisma.playerNotification.count({ where: { kind: 'announce' } })).toBe(0)
})

test('mark one and all survive fresh reads and exclude old rows and other players', async () => {
  const expired = await prisma.playerNotification.create({
    data: {
      playerId: juan.playerId,
      kind: 'account',
      title: 'Old',
      body: 'Old',
      target: '/profile/verification',
      createdAt: new Date(Date.now() - 91 * DAY),
    },
  })
  const before = await listPlayerNotifications(juan)
  expect(before.some((row) => row.id === expired.id)).toBe(false)
  expect(await countUnreadPlayerNotifications(juan)).toBe(
    before.filter((row) => !row.readAt).length,
  )
  const first = before.find((row) => !row.pinned)
  await markPlayerNotificationsRead(juan, first.id)
  const readAt = (await listPlayerNotifications(juan)).find((row) => row.id === first.id).readAt
  expect(readAt).toEqual(expect.any(String))
  await markPlayerNotificationsRead(juan, first.id)
  const otherCount = await countUnreadPlayerNotifications(maria)
  await markPlayerNotificationsRead(juan)
  await markPlayerNotificationsRead(juan)
  const after = await listPlayerNotifications(juan)
  expect(after.every((row) => row.readAt)).toBe(true)
  expect(after.find((row) => row.id === first.id).readAt).toBe(readAt)
  expect(await countUnreadPlayerNotifications(juan)).toBe(0)
  expect(await countUnreadPlayerNotifications(maria)).toBe(otherCount)
  expect(
    (await prisma.playerNotification.findUniqueOrThrow({ where: { id: expired.id } })).readAt,
  ).toBeNull()
})
