import { expect, test } from '@playwright/test'
import { asQueueMaster } from '../../src/api/sign-in.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { Engine, finishSession } from '../../src/sim/engine.ts'
import { PlayerPool, qmRequests, storedStatus, waitingInOrder } from '../../src/sim/requests.ts'
import { allPlayers } from '../../src/sim/rules.ts'
import { config } from '../../src/sim/run.ts'
import { SHAPES } from '../../src/sim/scenario.ts'

/**
 * Match requests one at a time (REG-17..21), in a Standard session that has run 40 virtual
 * minutes (games played differ, courts busy), through the real Route Handlers: the Player's Send
 * request on the Player app, the Queue Master's Requests › Match on Queue.
 */
test.beforeEach(() => test.setTimeout(10 * 60_000))

const MIDWAY = 40

async function inSession(
  id: string,
  body: (engine: Engine, pool: PlayerPool, log: string[]) => Promise<void>,
) {
  const client = await asQueueMaster()
  const engine = new Engine(
    config({ id, scenario: 'match requests', shape: SHAPES.standard }),
    new QueueMasterApi(client),
  )
  const pool = new PlayerPool(engine)
  try {
    await engine.setup()
    await engine.runUntil(MIDWAY)
    await engine.refresh()
    await body(engine, pool, engine.lines)
  } catch (error) {
    await test
      .info()
      .attach(`${id}.log`, { body: engine.lines.join('\n'), contentType: 'text/plain' })
    throw error
  } finally {
    await pool.dispose()
    await engine.abandon()
    await client.dispose()
  }
}

/** Present registered players, free ones first (not on a court). */
async function requesters(engine: Engine, pool: PlayerPool) {
  const registered = await pool.registered()
  const present = engine.roster.filter((p) => p.present && registered.has(p.id))
  return [...present.filter((p) => !engine.busy(p.id)), ...present.filter((p) => engine.busy(p.id))]
}

const queuedCount = (engine: Engine, id: string) =>
  waitingInOrder(engine.queue.matches).filter((m) => allPlayers(m).includes(id)).length

test('REG-17 Add to queue: Anyone filled with fewest-games present players, at the end of the Main Queue', async () => {
  await inSession('REG-17', async (engine, pool) => {
    const qm = qmRequests(engine)
    // A waiting match ahead of it, so "the end of the Main Queue" means something.
    if (!waitingInOrder(engine.queue.matches).length)
      await (engine as unknown as { generateAndAdd(n: number): Promise<boolean> }).generateAndAdd(1)
    await engine.refresh()
    const requester = (await requesters(engine, pool))[0]
    if (!requester) throw new Error('no present registered player')
    const player = await pool.for(requester.id)

    const sent = await player.send({ partners: [null], opponents: [null, null] })
    expect(sent.status, JSON.stringify(sent.body)).toBe(201)
    const id = sent.body.matchRequestId as string

    const before = await qm.read()
    expect(before.counts.match, 'requestCount counts the one open request').toBe(1)
    expect(before.match.map((r) => r.id)).toEqual([id])
    expect((await player.mine()).matchRequest?.id).toBe(id)

    // Load as the app fills Anyone: counted games + matches already queued, present players only.
    const options = await player.options()
    await engine.refresh()
    const load = new Map(options.players.map((p) => [p.id, p.games + queuedCount(engine, p.id)]))
    const waitingBefore = waitingInOrder(engine.queue.matches)
    const lastMatchNo = Math.max(0, ...engine.queue.matches.map((m) => m.matchNo))

    const added = await qm.add(id)
    expect(added.status, JSON.stringify(added.body)).toBe(201)
    const match = added.match as NonNullable<typeof added.match>
    expect(match.format).toBe('doubles')
    expect(match.teamA, "the requester's side").toContain(requester.id)
    expect(match.manualProtected).toBe(true)
    expect(match.matchNo).toBe(lastMatchNo + 1)

    const filled = allPlayers(match).filter((x) => x !== requester.id)
    expect(filled).toHaveLength(3)
    for (const x of filled) expect(load.has(x), `${engine.name(x)} is a present player`).toBe(true)
    const left = [...load.keys()].filter((x) => !filled.includes(x))
    const worstFilled = Math.max(...filled.map((x) => load.get(x) as number))
    const bestLeft = Math.min(...left.map((x) => load.get(x) as number))
    expect(
      worstFilled,
      `filled ${filled.map((x) => `${engine.name(x)}=${load.get(x)}`)} · left out best ${bestLeft}`,
    ).toBeLessThanOrEqual(bestLeft)

    await engine.refresh()
    const now = engine.match(match.id)
    expect(now?.state, 'every court is busy: the match waits').toBe('waiting')
    const waiting = waitingInOrder(engine.queue.matches)
    expect(waiting.at(-1)?.id, 'at the end of the Main Queue').toBe(match.id)
    expect(waiting.slice(0, -1).map((m) => m.id)).toEqual(
      waitingBefore.filter((m) => waiting.some((w) => w.id === m.id)).map((m) => m.id),
    )

    const after = await qm.read()
    expect(after.counts.match).toBe(0)
    expect(after.match).toEqual([])
    expect((await player.mine()).matchRequest).toBeNull()
    expect(storedStatus(id)).toBe('added')
    const again = await qm.add(id)
    expect(again.status, 'a retried Add returns the same match').toBe(201)
    expect(again.match?.id).toBe(match.id)

    // The normal routine: Auto Queue places it like any waiting match.
    await engine.runUntil(MIDWAY + 60)
    await engine.refresh()
    const later = engine.match(match.id)
    const decided = engine.decided.some((d) => d.matchId === match.id)
    expect(
      decided || later?.state === 'on_court' || later?.state === 'active',
      `request match is ${later?.state ?? 'gone'} an hour later`,
    ).toBe(true)
  })
})

test('REG-18 Add to queue keeps named partners and opponents exactly', async () => {
  await inSession('REG-18', async (engine, pool) => {
    const qm = qmRequests(engine)
    const requester = (await requesters(engine, pool))[0]
    if (!requester) throw new Error('no present registered player')
    const others = engine.roster.filter((p) => p.present && p.id !== requester.id)
    const [partner, o1, o2] = engine.rng.sample(others, 3).map((p) => p.id) as [
      string,
      string,
      string,
    ]
    const player = await pool.for(requester.id)
    const sent = await player.send({ partners: [partner], opponents: [o1, o2] })
    expect(sent.status, JSON.stringify(sent.body)).toBe(201)
    const id = sent.body.matchRequestId as string
    const open = (await qm.read()).match.find((r) => r.id === id)
    expect(open?.partners.map((s) => s?.rosterId)).toEqual([partner])
    expect(open?.opponents.map((s) => s?.rosterId)).toEqual([o1, o2])

    const added = await qm.add(id)
    expect(added.status, JSON.stringify(added.body)).toBe(201)
    // A team has no order: the same players on the same side.
    expect([...(added.match?.teamA ?? [])].sort()).toEqual([requester.id, partner].sort())
    expect([...(added.match?.teamB ?? [])].sort()).toEqual([o1, o2].sort())
  })
})

test('REG-19 Decline: no match, the request closes, the Player sees none', async () => {
  await inSession('REG-19', async (engine, pool) => {
    const qm = qmRequests(engine)
    const requester = (await requesters(engine, pool))[0]
    if (!requester) throw new Error('no present registered player')
    const player = await pool.for(requester.id)
    const sent = await player.send({ partners: [null], opponents: [null, null] })
    expect(sent.status, JSON.stringify(sent.body)).toBe(201)
    const id = sent.body.matchRequestId as string
    expect((await qm.read()).counts.match).toBe(1)
    await engine.refresh()
    const before = engine.queue

    const declined = await qm.decline(id)
    expect(declined.status, JSON.stringify(declined.body)).toBeLessThan(300)
    expect((declined.body as { status?: string }).status).toBe('declined')

    await engine.refresh()
    expect(
      engine.queue.matches.map((m) => m.id),
      'nothing queued',
    ).toEqual(before.matches.map((m) => m.id))
    expect(engine.queue.queueRevision, 'queue revision unchanged').toBe(before.queueRevision)
    const after = await qm.read()
    expect(after.counts.match).toBe(0)
    expect(after.match).toEqual([])
    expect((await player.mine()).matchRequest).toBeNull()
    expect(storedStatus(id)).toBe('declined')
    expect((await qm.add(id)).status, 'Add after Decline: already closed').toBe(409)
    expect((await qm.decline(id)).status, 'Decline twice: already closed').toBe(409)
  })
})

test('REG-20 a named partner Present off closes the request by itself', async () => {
  await inSession('REG-20', async (engine, pool) => {
    const qm = qmRequests(engine)
    const requester = (await requesters(engine, pool))[0]
    if (!requester) throw new Error('no present registered player')
    const partner = engine.freePresent([requester.id])[0]
    if (!partner) throw new Error('no free present partner')
    const player = await pool.for(requester.id)
    const sent = await player.send({ partners: [partner.id], opponents: [null, null] })
    expect(sent.status, JSON.stringify(sent.body)).toBe(201)
    const id = sent.body.matchRequestId as string
    expect((await qm.read()).counts.match).toBe(1)

    await engine.setPresent(partner.id, false, 'partner leaves')
    expect(storedStatus(id), 'closed by the presence change').toBe('closed')
    const after = await qm.read()
    expect(after.counts.match).toBe(0)
    expect(after.match).toEqual([])
    expect((await player.mine()).matchRequest).toBeNull()
    expect((await qm.add(id)).status, 'Add on a closed request').toBe(409)

    await engine.setPresent(partner.id, true, 'partner back')
    expect(storedStatus(id), 'never reopens').toBe('closed')
    expect((await qm.read()).counts.match).toBe(0)
  })
})

test('REG-21 Session done closes every open request', async () => {
  await inSession('REG-21', async (engine, pool) => {
    const qm = qmRequests(engine)
    const people = (await requesters(engine, pool)).slice(0, 2)
    expect(people.length).toBe(2)
    const ids: string[] = []
    for (const p of people) {
      const sent = await (await pool.for(p.id)).send({ partners: [null], opponents: [null, null] })
      expect(sent.status, JSON.stringify(sent.body)).toBe(201)
      ids.push(sent.body.matchRequestId as string)
    }
    expect((await qm.read()).counts.match).toBe(2)

    await finishSession(engine.api, engine.sessionId)
    const status = await engine.api.finalizationStatus(engine.sessionId)
    expect(status.state, `Session done ${status.stage}`).toBe('done')
    for (const id of ids) expect(storedStatus(id)).toBe('closed')
    const after = await qm.read()
    expect(after.counts.match).toBe(0)
    expect(after.match).toEqual([])
    for (const p of people) expect((await (await pool.for(p.id)).mine()).matchRequest).toBeNull()
  })
})
