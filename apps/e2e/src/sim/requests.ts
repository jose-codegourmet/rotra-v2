import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { request } from '@playwright/test'
import { readAccounts } from '../accounts.ts'
import { type ApiReply, AppClient } from '../api/client.ts'
import { asPlayer } from '../api/sign-in.ts'
import { assertLocalDbUrl } from '../guard.ts'
import { appUrl, E2E_DB_URL, psqlPath } from '../stack.ts'
import { matchOf } from './api.ts'
import type { Engine } from './engine.ts'
import type { Rng } from './prng.ts'
import type { Match } from './rules.ts'
import type { SimPlugin } from './scenario.ts'

/**
 * Match requests (REG-17..22) through the real Route Handlers: the Player's **Send request** on
 * the Player app (9101, Player cookie, credentialed calls from the paired Queue origin, as the
 * Queue session page sends them) and the Queue Master's Requests › Match **Add to queue** /
 * **Decline** on Queue (9100). Only registered players (the seeded accounts) can request.
 */

type Spot = { rosterId: string; games: number } | null
export type OpenRequest = {
  id: string
  format: string
  requester: { rosterId: string; games: number }
  partners: Spot[]
  opponents: Spot[]
}
export type SessionRequests = { counts: { match: number }; match: OpenRequest[] }
export type RequestOptions = {
  viewerRosterId: string
  allowedFormats: string[]
  players: { id: string; games: number }[]
}
export type MyRequest = { matchRequest: { id: string; format: string } | null }

/** One seeded player on the Player app, calling as the Queue session page does (Origin = Queue). */
export async function playerClient(n: number) {
  const signed = await asPlayer(n)
  const storageState = await signed.context.storageState()
  await signed.dispose()
  return new AppClient(
    'player',
    await request.newContext({
      baseURL: appUrl('player'),
      storageState,
      extraHTTPHeaders: { Origin: appUrl('queue') },
    }),
  )
}

export class PlayerRequests {
  readonly client: AppClient
  readonly slug: string
  constructor(client: AppClient, slug: string) {
    this.client = client
    this.slug = slug
  }
  private path(rest = '') {
    return `/api/public-sessions/${encodeURIComponent(this.slug)}/match-request${rest}`
  }
  /** Send request: partners / opponents are roster ids, null = Anyone. */
  send(input: {
    format?: string
    partners: (string | null)[]
    opponents: (string | null)[]
    requestId?: string
  }): Promise<ApiReply<{ matchRequestId?: string; message?: string }>> {
    return this.client.send('POST', this.path(), {
      requestId: input.requestId ?? randomUUID(),
      format: input.format ?? 'doubles',
      partners: input.partners,
      opponents: input.opponents,
    })
  }
  mine() {
    return this.client.get<MyRequest>(this.path())
  }
  options() {
    return this.client.get<RequestOptions>(this.path('/options'))
  }
  cancel() {
    return this.client.send('POST', this.path('/cancel'), {})
  }
}

/** The Queue Master's Requests › Match calls (club cookie, the engine's client). */
export function qmRequests(engine: Engine) {
  const base = `/api/sessions/${encodeURIComponent(engine.sessionId)}`
  const client = engine.api.client
  return {
    read: () => client.get<SessionRequests>(`${base}/requests`),
    async add(requestId: string) {
      const reply = await client.send<{ result: Parameters<typeof matchOf>[0] }>(
        'POST',
        `${base}/match-requests/${requestId}/add`,
        {},
      )
      return {
        status: reply.status,
        body: reply.body,
        match: reply.status < 300 ? matchOf(reply.body.result) : null,
      }
    },
    decline: (requestId: string) =>
      client.send('POST', `${base}/match-requests/${requestId}/decline`, {}),
  }
}

/** A stored request's status straight from the e2e database (the Player read hides closed ones). */
export function storedStatus(requestId: string) {
  assertLocalDbUrl('DATABASE_URL', E2E_DB_URL)
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error(`bad request id ${requestId}`)
  return execFileSync(psqlPath(), [E2E_DB_URL, '-qtA'], {
    input: `select status from session_match_requests where id = '${requestId}';`,
    encoding: 'utf8',
  }).trim()
}

/** Roster id → seeded player number, for the roster entries that are registered players. */
export async function registeredRoster(engine: Engine) {
  const byPlayer = new Map(readAccounts().players.map((p) => [p.playerId, p.n]))
  const clubPlayers = new Map(
    (await engine.api.clubPlayers()).map((c) => [c.id, c.playerId] as const),
  )
  const out = new Map<string, number>()
  for (const r of engine.roster) {
    const playerId = clubPlayers.get(r.clubPlayerId)
    const n = playerId ? byPlayer.get(playerId) : undefined
    if (n !== undefined) out.set(r.id, n)
  }
  return out
}

export const slugOf = (engine: Engine) => {
  const slug = engine.session.session.publicSlug
  if (!slug) throw new Error('[sim] the session has no public slug')
  return slug
}

/** Signs in each registered roster player once per engine (lazily). */
export class PlayerPool {
  readonly engine: Engine
  private numbers?: Map<string, number>
  private readonly clients = new Map<string, Promise<PlayerRequests>>()
  constructor(engine: Engine) {
    this.engine = engine
  }
  async registered() {
    this.numbers ??= await registeredRoster(this.engine)
    return this.numbers
  }
  async for(rosterId: string) {
    let client = this.clients.get(rosterId)
    if (!client) {
      const n = (await this.registered()).get(rosterId)
      if (n === undefined) throw new Error(`[sim] ${rosterId} is not a registered player`)
      client = playerClient(n).then((c) => new PlayerRequests(c, slugOf(this.engine)))
      this.clients.set(rosterId, client)
    }
    return client
  }
  async dispose() {
    for (const c of this.clients.values()) await (await c).client.dispose().catch(() => undefined)
    this.clients.clear()
  }
}

type Outcome = 'open' | 'added' | 'declined' | 'closed' | 'refused'
export type RequestRecord = {
  id: string
  t: number
  requester: string
  partner: string | null
  outcome: Outcome
  matchNo?: number
  detail?: string
}

type Range = readonly [number, number]

/**
 * Match requests during the session: at random virtual minutes, 10–20% of the present registered
 * players send a doubles request ("Anyone", or naming a present partner). At the next tick the
 * Queue Master decides each one still open: about half Add to queue (a protected waiting match at
 * the end of the Main Queue that Auto Queue places like any other), the rest Decline. A request
 * whose named player stopped being present closes by itself first.
 */
export function matchRequests(
  options: { rounds?: Range; fraction?: Range; window?: Range; addChance?: number } = {},
): SimPlugin & { records: RequestRecord[] } {
  const records: RequestRecord[] = []
  let pool: PlayerPool | undefined
  // The run's own stream (seeded runs replay exactly).
  let rng: Rng | undefined
  const decide = (record: RequestRecord, at: number) => ({
    at,
    kind: 'request decision',
    label: `QM decides ${record.id.slice(0, 6)}`,
    apply: async (engine: Engine) => {
      const qm = qmRequests(engine)
      const open = (await qm.read()).match.find((r) => r.id === record.id)
      const who = engine.name(record.requester)
      if (!open) {
        record.outcome = 'closed'
        engine.log(`match request from ${who} closed by itself before the QM decided`)
        return 'done' as const
      }
      if ((rng as Rng).chance(options.addChance ?? 0.5)) {
        const reply = await qm.add(record.id)
        if (reply.match) {
          record.outcome = 'added'
          record.matchNo = reply.match.matchNo
          engine.log(
            `match request from ${who} · Add to queue · #${reply.match.matchNo} ${engine.lineupText(reply.match)}`,
          )
        } else {
          record.outcome = 'refused'
          record.detail = `${reply.status} ${JSON.stringify(reply.body)}`
          engine.log(`match request from ${who} · Add to queue refused: ${record.detail}`)
          if (reply.status !== 409) engine.fail(`Add to queue: ${record.detail}`)
        }
      } else {
        const reply = await qm.decline(record.id)
        if (reply.status >= 300)
          engine.fail(`Decline: ${reply.status} ${JSON.stringify(reply.body)}`)
        record.outcome = 'declined'
        engine.log(`match request from ${who} · Decline`)
      }
      await engine.refresh()
      return 'done' as const
    },
  })
  return {
    name: 'match requests',
    records,
    plan: (engine) => {
      pool = new PlayerPool(engine)
      const own = engine.rng
      rng = own
      const end = engine.sessionMinutes
      const [lo, hi] = options.rounds ?? [3, 6]
      const [from, to] = options.window ?? [10, end - 20]
      return Array.from({ length: own.int(lo, hi) }, () => ({
        at: own.int(from, to),
        kind: 'match request',
        label: 'players send match requests',
        apply: async (e: Engine) => {
          const registered = await (pool as PlayerPool).registered()
          const busy = new Set(records.filter((r) => r.outcome === 'open').map((r) => r.requester))
          const present = e.roster.filter((p) => p.present)
          const candidates = present.filter((p) => registered.has(p.id) && !busy.has(p.id))
          if (!candidates.length) return 'skip' as const
          const [flo, fhi] = options.fraction ?? [0.1, 0.2]
          const share = flo + (rng as Rng).next() * (fhi - flo)
          const n = Math.max(1, Math.round(candidates.filter(Boolean).length * share))
          for (const p of (rng as Rng).sample(candidates, Math.min(n, candidates.length))) {
            const others = present.filter((x) => x.id !== p.id)
            const partner =
              (rng as Rng).chance(0.5) && others.length ? (rng as Rng).pick(others).id : null
            const client = await (pool as PlayerPool).for(p.id)
            const reply = await client.send({ partners: [partner], opponents: [null, null] })
            const who = `${e.name(p.id)}${partner ? ` with ${e.name(partner)}` : ' with Anyone'}`
            if (reply.status !== 201 || !reply.body.matchRequestId) {
              e.fail(`Send request (${who}): ${reply.status} ${JSON.stringify(reply.body)}`)
              continue
            }
            const record: RequestRecord = {
              id: reply.body.matchRequestId,
              t: e.t,
              requester: p.id,
              partner,
              outcome: 'open',
            }
            records.push(record)
            e.log(`match request sent · ${who} v Anyone`)
            e.schedule(decide(record, e.t + 1))
          }
          return 'done' as const
        },
      }))
    },
    finish: async (engine) => {
      const tally = (o: Outcome) => records.filter((r) => r.outcome === o).length
      engine.log(
        `match requests · ${records.length} sent: ${tally('added')} added, ${tally('declined')} declined, ` +
          `${tally('closed')} closed by itself, ${tally('refused')} refused, ${tally('open')} still open`,
      )
      engine.check(records.length > 0, 'no match request was sent')
      for (const r of records.filter((x) => x.outcome === 'open'))
        engine.check(
          storedStatus(r.id) === 'closed',
          `request from ${engine.name(r.requester)} is ${storedStatus(r.id)} after Session done (expected closed)`,
        )
      if (pool) {
        for (const id of new Set(records.map((r) => r.requester))) {
          const mine = await (await pool.for(id)).mine()
          engine.check(
            mine.matchRequest === null,
            `${engine.name(id)} still has an open match request after Session done`,
          )
        }
        await pool.dispose()
      }
    },
  }
}

/** The waiting matches in Main Queue order. */
export const waitingInOrder = (matches: Match[]) =>
  matches.filter((m) => m.state === 'waiting').sort((a, b) => a.queuePosition - b.queuePosition)
