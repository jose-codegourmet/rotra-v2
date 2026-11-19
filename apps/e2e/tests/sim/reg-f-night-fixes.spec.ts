import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { readAccounts } from '../../src/accounts.ts'
import { type AppClient, anonymous } from '../../src/api/client.ts'
import { firstFreeStart } from '../../src/api/schedule.ts'
import { asQueueMaster } from '../../src/api/sign-in.ts'
import { readClock } from '../../src/clock.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { Engine } from '../../src/sim/engine.ts'
import { PlayerPool, playerClient, slugOf } from '../../src/sim/requests.ts'
import { config } from '../../src/sim/run.ts'
import { SHAPES } from '../../src/sim/scenario.ts'

/**
 * The November 18 club night fixes (Q24, batch 962) through the real Route Handlers:
 * - REG-31 self check-in (I'm here / I'm leaving) and the club's switch;
 * - REG-32 Courts now in the Player's session access read;
 * - REG-33 a name-only guest's invite link registers onto the same club player;
 * - REG-34 I can't make it with Keep and Remove from roster;
 * - REG-35 the Session invite code is the same on every call.
 * The Player app calls come from the paired Queue origin, as the session page sends them.
 */
test.beforeEach(() => test.setTimeout(10 * 60_000))

const MINUTE = 60_000
const sessionPath = (slug: string, rest: string) =>
  `/api/public-sessions/${encodeURIComponent(slug)}${rest}`

async function inLiveSession(
  id: string,
  body: (engine: Engine, pool: PlayerPool, qm: AppClient) => Promise<void>,
) {
  const client = await asQueueMaster()
  const engine = new Engine(
    config({ id, scenario: 'club night fixes', shape: SHAPES.small }),
    new QueueMasterApi(client),
  )
  const pool = new PlayerPool(engine)
  try {
    await engine.setup()
    await engine.refresh()
    await body(engine, pool, client)
  } finally {
    await pool.dispose()
    await engine.abandon()
    await client.dispose()
  }
}

/** The first roster entry that is a registered (seeded) player. */
async function firstRegistered(engine: Engine, pool: PlayerPool) {
  const registered = await pool.registered()
  const entry = engine.roster.find((p) => registered.has(p.id))
  if (!entry) throw new Error('[e2e] no registered player on the roster')
  return entry
}

test("REG-31 self check-in: I'm here, I'm leaving, and the club switch off refusal", async () => {
  await inLiveSession('REG-31', async (engine, pool, qm) => {
    const api = new QueueMasterApi(qm)
    const entry = await firstRegistered(engine, pool)
    const slug = slugOf(engine)
    const player = (await pool.for(entry.id)).client
    const post = (rest: string) => player.send('POST', sessionPath(slug, rest), {})

    // Everyone starts present: I'm here is a 409 that changes nothing.
    expect((await post('/check-in')).status).toBe(409)

    // I'm leaving: Present off, with the Left mark; a second tap is a 409.
    expect((await post('/leave')).status).toBe(200)
    expect((await post('/leave')).status).toBe(409)
    let roster = await api.readRoster(engine.sessionId)
    expect(roster.find((p) => p.id === entry.id)?.present).toBe(false)

    // I'm here: Present on again.
    const back = await post('/check-in')
    expect(back.status, JSON.stringify(back.body)).toBe(200)
    roster = await api.readRoster(engine.sessionId)
    expect(roster.find((p) => p.id === entry.id)?.present).toBe(true)

    // The club turns Players can check themselves in off: I'm here is refused, I'm leaving works.
    const settings = async () => (await qm.get<{ club: { revision: string } }>('/api/club')).club
    const setSwitch = async (enabled: boolean) =>
      qm.patch('/api/club', {
        expectedRevision: (await settings()).revision,
        selfCheckInEnabled: enabled,
      })
    await setSwitch(false)
    try {
      expect((await post('/leave')).status).toBe(200)
      const refused = await post('/check-in')
      expect(refused.status, JSON.stringify(refused.body)).toBe(422)
      expect(JSON.stringify(refused.body)).toContain('self check-in off')
      roster = await api.readRoster(engine.sessionId)
      expect(roster.find((p) => p.id === entry.id)?.present).toBe(false)
    } finally {
      await setSwitch(true)
    }
    expect((await post('/check-in')).status).toBe(200)
  })
})

test("REG-32 Courts now: the signed-in Player's access read lists every court of a live session", async () => {
  await inLiveSession('REG-32', async (engine, pool) => {
    const entry = await firstRegistered(engine, pool)
    const player = (await pool.for(entry.id)).client
    const access = await player.get<{
      courtsNow: {
        id: string
        label: string
        status: 'free' | 'playing' | 'getting-ready'
        merged: boolean
        teamA: unknown[]
        teamB: unknown[]
      }[]
    }>(sessionPath(slugOf(engine), '/access'))
    await engine.refresh()
    expect(access.courtsNow.length).toBeGreaterThan(0)
    expect(access.courtsNow.length).toBeLessThanOrEqual(engine.liveCourts().length)
    for (const court of access.courtsNow) {
      expect(['free', 'playing', 'getting-ready']).toContain(court.status)
      // A free court names nobody; a court with a match names both teams.
      if (court.status === 'free') expect([court.teamA.length, court.teamB.length]).toEqual([0, 0])
      else expect(court.teamA.length + court.teamB.length).toBeGreaterThan(0)
    }
  })
})

/** A Prepared session (never started) with the first seeded players, for the before-start flows. */
async function inPreparedSession(
  title: string,
  body: (input: {
    qm: AppClient
    api: QueueMasterApi
    sessionId: string
    slug: string
    saved: { id: string; playerId: string | null }[]
  }) => Promise<void>,
  guests: string[] = [],
) {
  const qm = await asQueueMaster()
  const api = new QueueMasterApi(qm)
  let sessionId = ''
  try {
    const venueId = await api.addVenue(`Sim Hall ${title}`)
    const base = (await readClock('queue')).nowMs
    const startAt = firstFreeStart(await api.busyWindows(), base + 5 * MINUTE, 3 * 60 * MINUTE)
    sessionId = await api.createSession({
      title,
      venueId,
      startAt,
      endAt: startAt + 2 * 60 * MINUTE,
      allowSingles: true,
      allowDoubles: true,
      minimumGames: 0,
      minimumIsCalculated: false,
      expectedPlayers: 8,
      playersPerCourt: 6,
      courts: [{ label: 'Court 1' }, { label: 'Court 2' }],
    })
    const seeded = new Set(readAccounts().players.map((p) => p.playerId))
    const saved = (await api.clubPlayers()).filter((p) => p.playerId && seeded.has(p.playerId))
    await api.rosterBatch(sessionId, [
      ...saved.slice(0, 4).map((p) => ({
        source: 'saved' as const,
        clubPlayerId: p.id,
        level: 'intermediate_mid' as const,
      })),
      ...guests.map((name) => ({
        source: 'new' as const,
        name,
        level: 'intermediate_mid' as const,
      })),
    ])
    const slug = (await api.readSession(sessionId)).session.publicSlug
    if (!slug) throw new Error('[e2e] the session has no public slug')
    await body({ qm, api, sessionId, slug, saved })
  } finally {
    if (sessionId)
      await qm.send('POST', `/api/sessions/${sessionId}/cancel`, { reason: 'E2E cleanup' })
    await qm.dispose()
  }
}

/** Seeded player `n` (1-based) on the Player app, called from the paired Queue origin. */
const seededPlayer = (n: number) => playerClient(n)

test("REG-33 a name-only guest's invite link registers onto the same club player", async () => {
  const name = `E2E Claim Guest ${Date.now() % 1_000_000}`
  await inPreparedSession(
    'REG-33',
    async ({ qm, api, sessionId }) => {
      const roster = await api.readRoster(sessionId)
      const entry = roster.find((p) => (p as { name?: string }).name === name) ?? roster.at(-1)
      if (!entry) throw new Error('[e2e] the guest is not on the roster')
      const guest = (await api.clubPlayers()).find((p) => p.id === entry.clubPlayerId)
      expect(guest, 'the guest is a saved club player').toBeTruthy()
      expect(guest?.playerId, 'a guest has no ROTRA account yet').toBeNull()

      // A name only (no email, phone or shared entry) still gets the guest's own link.
      const link = await qm.post<{ token: string; expiresAt: string }>(
        `/api/club/players/${entry.clubPlayerId}/registration-link`,
        {},
      )
      expect(link.token.length).toBeGreaterThan(20)

      const visitor = await anonymous('player')
      try {
        const read = await visitor.get<{ link: { status: string } }>(`/api/claim/${link.token}`)
        expect(read.link.status).toBe('active')
        // The person types their own email and phone; the password is the seed's test value.
        const unique = Date.now() % 10_000_000
        const result = await visitor.post<{ playerId: string }>(`/api/claim/${link.token}`, {
          email: `e2e-claim-${randomUUID().slice(0, 8)}@rotra.test`,
          password: readAccounts().players[0]?.password,
          phone: `0917${String(unique).padStart(7, '0')}`,
          fullName: name,
          nickname: '',
          playingStyle: '',
          socialLinks: {},
        })
        expect(result.playerId).toBeTruthy()

        // The same club player now belongs to the new account: no second record, same roster entry.
        const after = await api.clubPlayers()
        expect(after.filter((p) => p.id === entry.clubPlayerId)).toHaveLength(1)
        expect(after.find((p) => p.id === entry.clubPlayerId)?.playerId).toBe(result.playerId)
        const rosterAfter = await api.readRoster(sessionId)
        expect(rosterAfter.find((p) => p.id === entry.id)?.clubPlayerId).toBe(entry.clubPlayerId)
      } finally {
        await visitor.dispose()
      }
    },
    [name],
  )
})

test("REG-34 I can't make it: Keep leaves the Player on the roster, Remove from roster releases the slot", async () => {
  await inPreparedSession('REG-34', async ({ qm, api, sessionId, slug, saved }) => {
    const first = saved[0]
    if (!first) throw new Error('[e2e] no saved seeded player')
    const n = readAccounts().players.find((p) => p.playerId === first.playerId)?.n
    if (n === undefined) throw new Error('[e2e] seeded player not found')
    const player = await seededPlayer(n)
    const requests = () =>
      qm.get<{ dropOuts: { id: string; playerId: string }[]; counts: { dropOuts: number } }>(
        `/api/sessions/${sessionId}/requests`,
      )
    const rosterIds = async () => (await api.readRoster(sessionId)).map((p) => p.clubPlayerId)
    try {
      const sent = await player.send<{ noticeId: string }>(
        'POST',
        sessionPath(slug, '/drop-out'),
        {},
      )
      expect(sent.status, JSON.stringify(sent.body)).toBe(200)
      // The slot stays, and a second notice is a 409.
      expect((await player.send('POST', sessionPath(slug, '/drop-out'), {})).status).toBe(409)
      let read = await requests()
      expect(read.dropOuts.map((d) => d.id)).toEqual([sent.body.noticeId])
      expect(read.counts.dropOuts).toBe(1)

      // Keep: the notice closes and the Player stays on the roster.
      await qm.post(`/api/sessions/${sessionId}/requests/drop-outs/${sent.body.noticeId}/keep`, {})
      expect((await requests()).dropOuts).toHaveLength(0)
      expect(await rosterIds()).toContain(first.id)

      // A new notice, then Remove from roster: the entry is released.
      const again = await player.send<{ noticeId: string }>(
        'POST',
        sessionPath(slug, '/drop-out'),
        {},
      )
      expect(again.status, JSON.stringify(again.body)).toBe(200)
      read = await requests()
      expect(read.dropOuts.map((d) => d.id)).toEqual([again.body.noticeId])
      await qm.post(
        `/api/sessions/${sessionId}/requests/drop-outs/${again.body.noticeId}/remove`,
        {},
      )
      expect((await requests()).dropOuts).toHaveLength(0)
      expect(await rosterIds()).not.toContain(first.id)
    } finally {
      await player.dispose()
    }
  })
})

test('REG-35 the Session invite code is the same on every call', async () => {
  await inPreparedSession('REG-35', async ({ slug, saved }) => {
    const [a, b] = [saved[0], saved[1]]
    if (!a || !b) throw new Error('[e2e] need two saved seeded players')
    const accounts = readAccounts().players
    const numberOf = (playerId: string | null) => accounts.find((p) => p.playerId === playerId)?.n
    const [na, nb] = [numberOf(a.playerId), numberOf(b.playerId)]
    if (na === undefined || nb === undefined) throw new Error('[e2e] seeded player not found')
    const first = await seededPlayer(na)
    const second = await seededPlayer(nb)
    try {
      const ask = (client: AppClient) =>
        client.send<{ code: string }>('POST', sessionPath(slug, '/invite-code'), {})
      const one = await ask(first)
      expect(one.status, JSON.stringify(one.body)).toBe(200)
      expect(one.body.code).toMatch(/^[a-z0-9]{6,16}$/)
      const two = await ask(first)
      expect(two.body.code).toBe(one.body.code)
      // Another Player gets their own code.
      const other = await ask(second)
      expect(other.status).toBe(200)
      expect(other.body.code).not.toBe(one.body.code)
    } finally {
      await first.dispose()
      await second.dispose()
    }
  })
})

// Not covered here (no helper in the suite yet): the join request resolving `?invite=` into
// "Invited by NAME" (still open in the Q24.6 notes), and the browser views of these flows.
