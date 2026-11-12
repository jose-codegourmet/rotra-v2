import { randomUUID } from 'node:crypto'
import type { ApiReply, AppClient } from '../api/client.ts'
import type {
  Match,
  MatchLineup,
  PlayingLevel,
  QueueSession,
  SessionCourt,
  SessionPlayer,
  SubstitutionCredit,
} from './rules.ts'

/**
 * The Queue Master's real calls on the Queue app (9100), with the same routes and bodies the
 * real-mode modules in packages/data/src/real/*.ts send. Wire shapes are converted to the data
 * package's types (epoch ms) the same way those modules do, so the pure rules read them as the
 * app's screens do.
 */

const ms = (iso: string) => Date.parse(iso)
const msOrNull = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null)
const iso = (value: number) => new Date(value).toISOString()

type WireSession = Omit<
  QueueSession,
  'scheduledStartAt' | 'scheduledEndAt' | 'startedAt' | 'finalizedAt' | 'playerRecordsUpdatedAt'
> & {
  scheduledStartAt: string
  scheduledEndAt: string
  startedAt: string | null
  finalizedAt: string | null
  revision: string
}
type WireCourt = {
  id: string
  sessionId: string
  label: string
  startsAt: string | null
  openedEarlyAt: string | null
  openUntil: string | null
  removedAt: string | null
}
type WireSummary = {
  session: WireSession
  courts: WireCourt[]
  rosterCount: number
  presentCount: number
  capacity: number
  waitlistCount: number
  courtsInUse: number
  gamesPlayed: number
  queuedCount: number
}
type WireRosterEntry = Omit<
  SessionPlayer,
  'presentChangedAt' | 'levelLockedAt' | 'confirmedAt' | 'selfCheckedInAt' | 'leftAt'
> & { presentChangedAt: string; levelLockedAt: string | null; confirmedAt: string }
type WireMatch = Omit<
  Match,
  'placedAt' | 'startedAt' | 'endedAt' | 'substitutions' | 'decision'
> & {
  placedAt?: string | null
  startedAt: string | null
  endedAt: string | null
  substitutions: (Omit<Match['substitutions'][number], 'at'> & { at: string })[]
  decision: (Omit<NonNullable<Match['decision']>, 'confirmedAt'> & { confirmedAt: string }) | null
}
type Command<T> = { result: T; queueRevision: string; autoPlaced?: WireMatch[] }

export type SessionRead = {
  session: QueueSession & { revision: string }
  courts: SessionCourt[]
  rosterCount: number
  presentCount: number
  capacity: number
  waitlistCount: number
}
export type QueueRead = { matches: Match[]; queueRevision: string; revision: string }
export type DoneReview = {
  blocking: string[]
  activeMatches: number
  belowMinimum: { sessionPlayerId: string; name: string; games: number }[]
}
export type FinalizationStatus = {
  state: 'running' | 'committed' | 'done' | 'failed'
  stage: string
  accepted: boolean
  failedStage: string | null
  jobs: { kind: string; status: string }[]
}
export type StandingRow = {
  sessionPlayerId: string
  name: string
  games: number
  wins: number
  losses: number
}

export const courtOf = (c: WireCourt): SessionCourt => ({
  id: c.id,
  sessionId: c.sessionId,
  label: c.label,
  startsAt: msOrNull(c.startsAt) ?? undefined,
  openedEarlyAt: msOrNull(c.openedEarlyAt),
  openUntil: msOrNull(c.openUntil),
  removedAt: msOrNull(c.removedAt),
})
const rosterOf = (e: WireRosterEntry): SessionPlayer => ({
  ...e,
  presentChangedAt: ms(e.presentChangedAt),
  levelLockedAt: msOrNull(e.levelLockedAt),
  confirmedAt: ms(e.confirmedAt),
})
export const matchOf = (m: WireMatch): Match => ({
  id: m.id,
  sessionId: m.sessionId,
  matchNo: m.matchNo,
  state: m.state,
  format: m.format,
  queuePosition: m.queuePosition,
  origin: m.origin,
  manualProtected: m.manualProtected,
  teamA: m.teamA,
  teamB: m.teamB,
  courtIds: m.courtIds,
  placedAt: msOrNull(m.placedAt ?? null),
  startedAt: msOrNull(m.startedAt),
  endedAt: msOrNull(m.endedAt),
  substitutions: m.substitutions.map((s) => ({ ...s, at: ms(s.at) })),
  decision: m.decision && { ...m.decision, confirmedAt: ms(m.decision.confirmedAt) },
})

export type CreateSessionInput = {
  title: string
  venueId: string
  startAt: number
  endAt: number
  allowSingles: boolean
  allowDoubles: boolean
  minimumGames: number
  minimumIsCalculated: boolean
  expectedPlayers: number
  playersPerCourt: number
  courts: { label: string; startsAt?: number | null; openUntil?: number | null }[]
}

export class QueueMasterApi {
  readonly client: AppClient
  constructor(client: AppClient) {
    this.client = client
  }
  private path(sessionId: string, rest = '') {
    return `/api/sessions/${encodeURIComponent(sessionId)}${rest}`
  }

  // ---------- Preparation ----------

  async addVenue(name: string) {
    const id = randomUUID()
    await this.client.post('/api/venues', { id, name, address: '1 Test Street' })
    return id
  }

  async createSession(input: CreateSessionInput) {
    const created = await this.client.post<{ firstSessionId: string }>('/api/sessions', {
      commandId: randomUUID(),
      input: {
        title: input.title,
        notes: '',
        venueId: input.venueId,
        scheduledStartAt: iso(input.startAt),
        scheduledEndAt: iso(input.endAt),
        sessionMode: 'fair',
        allowSingles: input.allowSingles,
        allowDoubles: input.allowDoubles,
        minimumGames: input.minimumGames,
        minimumIsCalculated: input.minimumIsCalculated,
        expectedPlayers: input.expectedPlayers,
        playersPerCourt: input.playersPerCourt,
        courts: input.courts.map((c) => ({
          label: c.label,
          startsAt: c.startsAt == null ? null : iso(c.startsAt),
          openUntil: c.openUntil == null ? null : iso(c.openUntil),
        })),
        costEstimate: null,
      },
    })
    return created.firstSessionId
  }

  /** The club's saved players (registration saved every seeded player). */
  async clubPlayers() {
    return (
      await this.client.get<{ players: { id: string; playerId: string | null }[] }>(
        '/api/club/players',
      )
    ).players
  }

  /** The roster burst batch: saved players and new guests in one call (`source: 'saved' | 'new'`). */
  async rosterBatch(
    sessionId: string,
    operations: (
      | { source: 'saved'; clubPlayerId: string; level: PlayingLevel; allowOverfill?: boolean }
      | { source: 'new'; name: string; level: PlayingLevel; allowOverfill?: boolean }
    )[],
  ) {
    return this.client.post<{
      results: { rosterEntry: { id: string } | null; waitlist: { id: string } | null }[]
    }>(this.path(sessionId, '/roster/batch'), {
      operations: operations.map((o) => ({ op: 'add', operationId: randomUUID(), ...o })),
    })
  }

  setAllPresence(sessionId: string, present: boolean) {
    return this.client.post(this.path(sessionId, '/presence'), { all: present })
  }
  setPresence(sessionId: string, changes: { rosterId: string; present: boolean }[]) {
    return this.client.post(this.path(sessionId, '/presence'), { changes })
  }

  async startSession(sessionId: string) {
    const { session } = await this.readSession(sessionId)
    return this.client.post<WireSession>(this.path(sessionId, '/start'), {
      expectedRevision: session.revision,
      newEndAt: null,
    })
  }

  // ---------- Reads ----------

  async readSession(sessionId: string): Promise<SessionRead> {
    const wire = await this.client.get<WireSummary>(this.path(sessionId))
    const s = wire.session
    return {
      session: {
        ...s,
        scheduledStartAt: ms(s.scheduledStartAt),
        scheduledEndAt: ms(s.scheduledEndAt),
        startedAt: msOrNull(s.startedAt),
        finalizedAt: msOrNull(s.finalizedAt),
        playerRecordsUpdatedAt: null,
      },
      courts: wire.courts.map(courtOf),
      rosterCount: wire.rosterCount,
      presentCount: wire.presentCount,
      capacity: wire.capacity,
      waitlistCount: wire.waitlistCount,
    }
  }
  async readRoster(sessionId: string) {
    const wire = await this.client.get<{ roster: WireRosterEntry[] }>(
      this.path(sessionId, '/roster'),
    )
    return wire.roster.map(rosterOf)
  }
  async readQueue(sessionId: string): Promise<QueueRead> {
    const wire = await this.client.get<{
      matches: WireMatch[]
      queueRevision: string
      revision: string
    }>(this.path(sessionId, '/matches'))
    return {
      matches: wire.matches.map(matchOf).sort((a, b) => a.queuePosition - b.queuePosition),
      queueRevision: wire.queueRevision,
      revision: wire.revision,
    }
  }
  async listSessions() {
    return (await this.client.get<{ sessions: WireSummary[] }>('/api/sessions')).sessions.map(
      (s) => s.session,
    )
  }

  // ---------- Queue and courts ----------

  async setCourtFillMode(sessionId: string, mode: 'auto' | 'manual') {
    const reply = await this.client.call<Command<{ mode: string; placed: WireMatch[] }>>(
      'PATCH',
      this.path(sessionId, '/court-fill'),
      { mode },
    )
    return reply.result.placed.map(matchOf)
  }
  /** Auto Queue for courts that reached their planned opening time (the console's refresh). */
  async fillOpenedCourts(sessionId: string, courtIds: string[]) {
    const reply = await this.client.post<Command<{ placed: WireMatch[] }>>(
      this.path(sessionId, '/court-fill'),
      { courtIds },
    )
    return reply.result.placed.map(matchOf)
  }

  /** Generate matches › Add to Main Queue: the reviewed drafts as `source: 'auto'`. */
  async transferDrafts(
    sessionId: string,
    read: QueueRead,
    drafts: (MatchLineup & { mode: string })[],
  ) {
    const reply = await this.client.post<Command<WireMatch[]>>(this.path(sessionId, '/matches'), {
      source: 'auto',
      drafts: drafts.map((d) => ({
        operationId: randomUUID(),
        mode: d.mode,
        lineup: { format: d.format, teamA: d.teamA, teamB: d.teamB },
      })),
      expectedQueueRevision: read.queueRevision,
      expectedRevision: read.revision,
    })
    return { added: reply.result.map(matchOf), autoPlaced: (reply.autoPlaced ?? []).map(matchOf) }
  }
  async regenerate(sessionId: string, read: QueueRead) {
    const reply = await this.client.post<Command<WireMatch[]>>(
      this.path(sessionId, '/matches/regenerate'),
      { operationId: randomUUID(), expectedQueueRevision: read.queueRevision },
    )
    return { rebuilt: reply.result.map(matchOf), autoPlaced: (reply.autoPlaced ?? []).map(matchOf) }
  }
  removeWaiting(sessionId: string, matchId: string, read: QueueRead) {
    return this.client.call('DELETE', this.path(sessionId, `/matches/${matchId}`), {
      expectedQueueRevision: read.queueRevision,
    })
  }

  sendStart(sessionId: string, matchId: string): Promise<ApiReply> {
    return this.client.send('POST', this.path(sessionId, `/matches/${matchId}/start`), {
      operationId: randomUUID(),
      courtIds: [],
    })
  }
  async result(sessionId: string, matchId: string, winningTeam: 'A' | 'B', holdCourtId?: string) {
    const reply = await this.client.post<Command<{ match: WireMatch }>>(
      this.path(sessionId, `/matches/${matchId}/result`),
      {
        operationId: randomUUID(),
        winningTeam,
        teamAScore: null,
        teamBScore: null,
        ...(holdCourtId ? { holdCourtId } : {}),
      },
    )
    return { match: matchOf(reply.result.match), autoPlaced: (reply.autoPlaced ?? []).map(matchOf) }
  }
  /** Send back to queue: the On court match goes to #1 and its court frees (refills in Auto). */
  async sendBack(sessionId: string, matchId: string) {
    const reply = await this.client.post<Command<WireMatch>>(
      this.path(sessionId, `/matches/${matchId}/send-back`),
      { operationId: randomUUID() },
    )
    return matchOf(reply.result)
  }
  async invalid(sessionId: string, matchId: string) {
    const reply = await this.client.post<Command<{ match: WireMatch }>>(
      this.path(sessionId, `/matches/${matchId}/invalid`),
      { operationId: randomUUID() },
    )
    return { match: matchOf(reply.result.match), autoPlaced: (reply.autoPlaced ?? []).map(matchOf) }
  }
  async substitute(
    sessionId: string,
    matchId: string,
    outId: string,
    inId: string,
    creditTo: SubstitutionCredit,
  ) {
    const reply = await this.client.post<Command<WireMatch>>(
      this.path(sessionId, `/matches/${matchId}/substitution`),
      { operationId: randomUUID(), outId, inId, creditTo },
    )
    return matchOf(reply.result)
  }
  async replace(sessionId: string, matchId: string, outId: string, inId: string) {
    const reply = await this.client.post<Command<WireMatch>>(
      this.path(sessionId, `/matches/${matchId}/replace`),
      { operationId: randomUUID(), outId, inId },
    )
    return matchOf(reply.result)
  }

  async addCourt(
    sessionId: string,
    input: { label: string; startsAt?: number | null; openUntil?: number | null },
  ) {
    const { court } = await this.client.post<{ court: WireCourt }>(
      this.path(sessionId, '/courts'),
      {
        courtId: randomUUID(),
        label: input.label,
        startsAt: input.startsAt == null ? null : iso(input.startsAt),
        openUntil: input.openUntil == null ? null : iso(input.openUntil),
      },
    )
    return courtOf(court)
  }
  sendRemoveCourt(sessionId: string, courtId: string) {
    return this.client.send('DELETE', this.path(sessionId, `/courts/${courtId}`))
  }
  async openCourtEarly(sessionId: string, courtId: string) {
    const { court } = await this.client.post<{ court: WireCourt }>(
      this.path(sessionId, `/courts/${courtId}/open-early`),
      {},
    )
    return courtOf(court)
  }

  // ---------- Session done ----------

  doneReview(sessionId: string) {
    return this.client.get<DoneReview>(this.path(sessionId, '/done-review'))
  }
  async finalize(sessionId: string) {
    const { status } = await this.client.post<{ status: FinalizationStatus }>(
      this.path(sessionId, '/finalization'),
      { commandId: randomUUID() },
    )
    return status
  }
  finalizationStatus(sessionId: string) {
    return this.client.get<FinalizationStatus>(this.path(sessionId, '/finalization'))
  }
  async standings(sessionId: string) {
    const reply = await this.client.get<{ snapshot: { standings: StandingRow[] } | null } | null>(
      this.path(sessionId, '/results'),
    )
    return reply?.snapshot?.standings ?? null
  }
}
