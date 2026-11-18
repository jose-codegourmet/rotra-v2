// Run against the migrated local disposable database with prisma/fixtures/fictional.sql loaded.
import { randomUUID } from 'node:crypto'
import { leaderboardStandings } from '@rotra/data/leaderboard/rules'
import { LEADERBOARD_PERIODS } from '@rotra/data/leaderboard/types'
import { prisma } from '../src/client/prisma'
import { readPlayerCompare } from '../src/player/compare'
import { readPeriodLeaderboard } from '../src/player/leaderboard'
import { readPublicProfile } from '../src/player/profile'

vi.mock('server-only', () => ({}))

const clubId = 'c1000000-0000-4000-8000-00000000000a'
const secondClub = 'c1000000-0000-4000-8000-00000000000b'
const locationCodeId = '10c00000-0000-4000-8000-000000000001'
const juan = '91000000-0000-4000-8000-000000000001'
const maria = '91000000-0000-4000-8000-000000000003'
const playedNow = Date.parse('2032-11-10T10:00:00Z')

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

/** Undo even append-only facts by rolling back the transaction that created them. */
async function withFixtures(run) {
  const rollback = new Error('rollback test fixtures')
  try {
    await prisma.$transaction(
      async (tx) => {
        await run(tx)
        throw rollback
      },
      { timeout: 45_000 },
    )
  } catch (error) {
    if (error !== rollback) throw error
  }
}

test('reviewed guest history, overlapping attribution and protected profile/Compare reads', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-21T09:00:00Z'))
  try {
    await withFixtures(async (tx) => {
      await tx.playerHistoryAttribution.create({
        data: {
          clubId,
          playerId: juan,
          clubPlayerId: 'cb000000-0000-4000-8000-0000000000a1',
          confirmedAt: new Date(),
          confirmationEvidence: { method: 'fixture' },
          sourceCommandId: randomUUID(),
        },
      })
      const board = await readPeriodLeaderboard('week', Date.now(), tx)
      expect(board.own(juan).wins).toBe(1)
      expect(board.own(maria)).toMatchObject({ wins: 0, losses: 1 })
    })
    await expect(readPublicProfile(maria)).rejects.toMatchObject({ code: 'unauthenticated' })
    const profile = await readPublicProfile(juan)
    expect(profile.leaderboardPlaces).toEqual(
      LEADERBOARD_PERIODS.map((period) => ({ period, position: 1, wins: 1 })),
    )
    const compare = await readPlayerCompare({ kind: 'player', playerId: maria }, juan)
    expect(compare.other.profile.leaderboardPlaces).toEqual(profile.leaderboardPlaces)
    expect(compare.viewer.profile.leaderboardPlaces).toEqual(
      LEADERBOARD_PERIODS.map((period) => ({ period, position: 2, wins: 0 })),
    )
  } finally {
    clock.mockRestore()
  }
})

async function createPlayers(tx) {
  const syncDate = new Date('2032-10-02T00:00:00Z')
  const players = Array.from({ length: 54 }, (_, i) => ({
    id: randomUUID(),
    clubPlayerId: randomUUID(),
    fullName: `Fictional Player ${String(i).padStart(2, '0')}`,
    nickname: null,
    unclaimedClubCount: i === 2 ? 1 : i === 3 ? 2 : undefined,
  }))
  await tx.player.createMany({
    data: players.map((p, i) => ({
      id: p.id,
      fullName: p.fullName,
      nickname: p.nickname,
      profileState: p.unclaimedClubCount ? 'unclaimed' : 'claimed',
      profileVisibility:
        i === 0 ? 'always_private' : i === 1 || p.unclaimedClubCount ? 'private' : 'public',
      avatarRef: 'character:fixture',
    })),
  })
  await tx.clubPlayer.createMany({
    data: players.map((p) => ({
      id: p.clubPlayerId,
      clubId,
      playerId: p.id,
      displayName: p.fullName,
      addedAt: syncDate,
    })),
  })
  await tx.clubPlayer.create({
    data: {
      id: randomUUID(),
      clubId: secondClub,
      playerId: players[3].id,
      displayName: 'Other club name',
      addedAt: syncDate,
    },
  })
  await tx.playerIdCounter.create({
    data: { locationCodeId, syncDate, lastSequence: players.length },
  })
  await tx.playerIdAllocation.createMany({
    data: players.map((p, i) => ({
      playerId: p.id,
      creatingClubId: clubId,
      locationCodeId,
      countryCode: 'PH',
      cityCode: 'CEB',
      syncDate,
      sequence: i + 1,
      rtrId: `RTR-PH-CEB-100232-${String(i + 1).padStart(4, '0')}`,
    })),
  })
  return players
}

/** Each pairing records two winner-only facts. The commit clock may be days after play. */
async function recordSession(
  tx,
  players,
  date,
  pairs,
  { format = 'singles', partial = false, committedAt } = {},
) {
  const playedAt = new Date(date)
  const start = new Date(playedAt.getTime() - 30 * 60_000)
  const commit = committedAt ?? playedAt
  const sessionId = randomUUID()
  const scope = { clubId, sessionId }
  await tx.queueSession.create({
    data: {
      id: sessionId,
      clubId,
      title: 'Fictional leaderboard fixture',
      state: 'completed',
      scheduledStartAt: start,
      scheduledEndAt: playedAt,
      startedAt: start,
      finalizedAt: commit,
      playersPerCourt: 4,
      publicSlug: sessionId,
      sourceCommandId: randomUUID(),
    },
  })
  const policy = await tx.rankingPolicyVersion.findFirstOrThrow({
    where: { version: 1 },
    select: { id: true },
  })
  await tx.sessionFinalization.create({
    data: {
      ...scope,
      commandId: randomUUID(),
      state: 'committed',
      stage: 'player_records',
      streamManifest: [],
      manifestDigest: Buffer.alloc(32),
      factsDigest: Buffer.alloc(32),
      acceptedSessionRevision: 1n,
      policyVersionId: policy.id,
      startedAt: start,
      committedAt: commit,
    },
  })
  const roster = new Map([...new Set(pairs.flat())].map((i) => [i, randomUUID()]))
  await tx.sessionPlayer.createMany({
    data: [...roster].map(([index, id]) => ({
      ...scope,
      id,
      clubPlayerId: players[index].clubPlayerId,
      playerIdAtEntry: players[index].id,
      nameSnapshot: players[index].fullName,
      presentChangedAt: start,
      confirmedAt: start,
      joinedAt: start,
    })),
  })
  const matches = pairs.map(() => randomUUID())
  await tx.match.createMany({
    data: matches.map((id, index) => ({
      ...scope,
      id,
      matchNo: index + 1,
      state: 'completed',
      format,
      origin: 'manual',
      sourceOperationId: randomUUID(),
      startedAt: start,
      endedAt: playedAt,
    })),
  })
  await tx.matchDecision.createMany({
    data: matches.map((matchId) => ({
      ...scope,
      matchId,
      kind: 'completed',
      winningTeam: 'A',
      sourceOperationId: randomUUID(),
      confirmedAt: playedAt,
      acceptedAt: commit,
      actorClubId: clubId,
    })),
  })
  const facts = pairs.flatMap((pair, game) =>
    pair.map((i, side) => ({
      ...scope,
      matchId: matches[game],
      sessionPlayerId: roster.get(i),
      clubPlayerId: players[i].clubPlayerId,
      playerIdAtFinalization: players[i].id,
      playedAt,
      format,
      team: side ? 'B' : 'A',
      winningTeam: 'A',
      fullParticipation: !partial,
      standardMatch: format === 'singles',
      skillLevelSnapshotId: 4,
      partnerEntryIds: [],
      opponentEntryIds: [roster.get(pair[1 - side])],
      factVersion: 1,
    })),
  )
  await tx.playerMatchFact.createMany({ data: facts })
  return facts.map((f) => ({
    playerId: f.playerIdAtFinalization,
    playedAt,
    won: f.team === 'A',
    valid: true,
    fullParticipation: f.fullParticipation,
    standardMatch: f.standardMatch,
  }))
}

test('calendar lists match mock rules, late sync corrects movement and only the owner sees below 50', async () => {
  await withFixtures(async (tx) => {
    const players = await createPlayers(tx)
    const facts = []
    const record = async (...args) => facts.push(...(await recordSession(tx, players, ...args)))
    await record('2031-12-31T15:59:00Z', [[1, 0]])
    await record('2032-10-30T10:00:00Z', [[0, 1]])
    await record('2032-11-01T10:00:00Z', [[0, 1]])
    const pairs = Array.from({ length: 27 }, (_, i) => [i * 2, i * 2 + 1])
    await record('2032-11-08T10:00:00Z', pairs)
    await record('2032-11-09T08:00:00Z', [[1, 0]], { format: 'fun_1v2' })
    await record('2032-11-09T10:00:00Z', [[1, 0]], { partial: true })
    const before = await readPeriodLeaderboard('week', playedNow, tx)
    expect(before.own(players[0].id).previousPosition).toBe(1)
    await record(
      '2032-11-06T10:00:00Z',
      [
        [1, 0],
        [1, 0],
      ],
      { committedAt: new Date(playedNow) },
    )
    const annual = await readPeriodLeaderboard('year', playedNow, tx)
    const places = annual.places(players.map((p) => p.id))
    for (const period of LEADERBOARD_PERIODS) {
      const expected = leaderboardStandings(period, playedNow, players, facts)
      const board = await readPeriodLeaderboard(period, playedNow, tx)
      const page = await board.page(0, 50, null)
      expect(page.total).toBe(50)
      expect(
        page.entries.map(({ id, wins, losses, previousPosition, position }) => ({
          id,
          wins,
          losses,
          previousPosition,
          position,
        })),
      ).toEqual(expected.slice(0, 50))
      expect((await board.page(50, 25, null)).entries).toEqual([])
      const below = expected[50]
      expect(board.own(below.id)).toMatchObject({
        position: 51,
        wins: below.wins,
        cutoffWins: expected[49].wins,
      })
      expect(places.get(below.id).some((place) => place.period === period)).toBe(false)
      expect(places.get(expected[0].id)).toContainEqual({
        period,
        position: 1,
        wins: expected[0].wins,
      })
      expect(
        (await board.search(players.find((p) => p.id === below.id).fullName, null)).total,
      ).toBe(0)
    }
    const week = await readPeriodLeaderboard('week', playedNow, tx)
    expect(week.own(players[0].id)).toMatchObject({ wins: 1, losses: 0, previousPosition: 2 })
    const page = await week.page(0, 50, null)
    const row = (i) => page.entries.find((r) => r.id === players[i].id)
    expect(row(0)).toMatchObject({
      masked: true,
      levelHidden: true,
      pictureUrl: 'character:fixture',
    })
    expect(row(1)).toMatchObject({ masked: true, levelHidden: false, pictureUrl: null })
    expect(row(2)).toMatchObject({ unclaimed: true, masked: false })
    expect(row(3)).toBeUndefined()
    expect((await week.search(players[0].fullName, players[1].id)).total).toBe(0)
    expect((await week.search(players[0].fullName, players[0].id)).total).toBe(1)
    expect((await week.search(players[1].fullName, players[0].id)).total).toBe(1)
    expect((await week.search(players[1].fullName, null)).total).toBe(0)
    await tx.clubPlayer.update({
      where: { clubId_playerId: { clubId: secondClub, playerId: players[3].id } },
      data: { removedAt: new Date(playedNow) },
    })
    const afterRemoval = await readPeriodLeaderboard('week', playedNow, tx)
    expect(afterRemoval.own(players[3].id).position).not.toBeNull()
  })
}, 60_000)
