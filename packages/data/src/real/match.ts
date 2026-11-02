import { computeStandings, courtNames, FORMAT_LABELS, shortName } from '../match/match.rules'
import type { Match, MatchLineup } from '../match/match.types'
import { MockError } from '../mock/errors'
import type {
  PublishResultsInput,
  SessionPublication,
  SessionResultSnapshot,
} from '../session-result/sessionResult.types'
import { msOf, msOrNull, realRequest } from './client'
import { accepted, realGetQueueSession, realGetSessionRoster } from './queue'

/**
 * Real-mode transport for matches, results and Mark session invalid (#396). Online only: offline
 * nothing is sent (`realRequest` refuses), because the durable outbox and offline match numbering
 * wait on #246. Each command sends a fresh operation ID unless the screen already supplies one.
 */

const sessionPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}`

// ---------- Matches (Q-QUEUE, Q-MATCH) ----------

type WireMatch = Omit<Match, 'startedAt' | 'endedAt' | 'substitutions' | 'decision'> & {
  startedAt: string | null
  endedAt: string | null
  substitutions: { outId: string; inId: string; team: 'A' | 'B'; at: string }[]
  decision: (Omit<NonNullable<Match['decision']>, 'confirmedAt'> & { confirmedAt: string }) | null
  revision: string
}

const matchOf = (m: WireMatch): Match => ({
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
  startedAt: msOrNull(m.startedAt),
  endedAt: msOrNull(m.endedAt),
  substitutions: m.substitutions.map((s) => ({ ...s, at: msOf(s.at) })),
  decision: m.decision && { ...m.decision, confirmedAt: msOf(m.decision.confirmedAt) },
})

/**
 * The last read of each session's queue: the matches the screen shows and the revisions they came
 * with. Reorder, edit, Auto queue, Regenerate and an accepted suggestion send these back, so a
 * change made elsewhere since that read is a conflict instead of a silent overwrite.
 */
type QueueRead = { queueRevision: string; revision: string; matches: Match[] }
const reads = new Map<string, QueueRead>()

async function readQueue(sessionId: string) {
  const wire = await realRequest<{
    matches: WireMatch[]
    queueRevision: string
    revision: string
  }>(`${sessionPath(sessionId)}/matches`)
  const read = {
    queueRevision: wire.queueRevision,
    revision: wire.revision,
    matches: wire.matches.map(matchOf),
  }
  reads.set(sessionId, read)
  return read
}
const lastRead = async (sessionId: string) => reads.get(sessionId) ?? readQueue(sessionId)

function shownMatch(read: QueueRead, matchId: string) {
  const match = read.matches.find((m) => m.id === matchId)
  if (!match) throw new MockError('permission', 'Match not available.')
  return match
}
const shownWaiting = (read: QueueRead) =>
  read.matches
    .filter((m) => m.state === 'waiting')
    .sort((a, b) => a.queuePosition - b.queuePosition)

/** The session a shown match belongs to; control commands only carry the match ID. */
function sessionOf(matchId: string) {
  for (const [sessionId, read] of reads)
    if (read.matches.some((m) => m.id === matchId)) return sessionId
  throw new MockError('permission', 'Match not available.')
}

/**
 * One queue command. The shown queue revision moves forward only when the reply proves this was
 * the only change since the read; otherwise the next refetch brings the screen up to date first.
 */
async function queueCommand<T>(
  sessionId: string,
  path: string,
  options: { method?: 'POST' | 'PATCH' | 'DELETE'; body: unknown },
) {
  const done = await realRequest<{ result: T; queueRevision: string }>(
    `${sessionPath(sessionId)}${path}`,
    { method: options.method ?? 'POST', body: options.body },
  )
  const read = reads.get(sessionId)
  if (read && BigInt(read.queueRevision) + 1n === BigInt(done.queueRevision))
    read.queueRevision = done.queueRevision
  return done.result
}

export async function realGetSessionMatches(sessionId: string) {
  const { matches } = await readQueue(sessionId)
  return [...matches].sort((a, b) => a.queuePosition - b.queuePosition)
}

/** Live standings use the shared counting rule over the saved roster and matches. */
export async function realGetLiveStandings(sessionId: string) {
  const [{ roster }, { matches }] = await Promise.all([
    realGetSessionRoster(sessionId),
    readQueue(sessionId),
  ])
  return computeStandings(roster, matches)
}

export async function realAddMatch(input: MatchLineup & { sessionId: string }) {
  const match = await queueCommand<WireMatch>(input.sessionId, '/matches', {
    body: {
      source: 'manual',
      operationId: crypto.randomUUID(),
      lineup: { format: input.format, teamA: input.teamA, teamB: input.teamB },
    },
  })
  return accepted(matchOf(match), 'Match added to the queue')
}

export async function realMakeMatch(input: { sessionId: string; selection: string[] }) {
  const read = await lastRead(input.sessionId)
  const match = matchOf(
    await queueCommand<WireMatch>(input.sessionId, '/matches', {
      body: { source: 'selection', operationId: crypto.randomUUID(), selection: input.selection },
    }),
  )
  const position = shownWaiting(read).filter((m) => m.id !== match.id).length + 1
  return accepted(match, `${FORMAT_LABELS[match.format]} added to the queue at #${position}`)
}

/** Sent with both revisions of the read the suggestion was drawn from. */
export async function realAddSuggestedMatch(input: {
  sessionId: string
  lineup: MatchLineup
  switched: boolean
}) {
  const read = await lastRead(input.sessionId)
  const match = await queueCommand<WireMatch>(input.sessionId, '/matches', {
    body: {
      source: 'suggested',
      operationId: crypto.randomUUID(),
      lineup: input.lineup,
      switched: input.switched,
      expectedQueueRevision: read.queueRevision,
      expectedRevision: read.revision,
    },
  })
  return accepted(matchOf(match), 'Suggestion added to the queue')
}

export async function realAutoQueue(input: { sessionId: string; n: 2 | 3 | 4 | 6 }) {
  const read = await lastRead(input.sessionId)
  const matches = await queueCommand<WireMatch[]>(input.sessionId, '/matches/auto', {
    body: {
      operationId: crypto.randomUUID(),
      n: input.n,
      expectedQueueRevision: read.queueRevision,
    },
  })
  return accepted(matches.map(matchOf), `${matches.length} matches added to the queue`)
}

export async function realRegenerateQueue(sessionId: string) {
  const read = await lastRead(sessionId)
  const matches = await queueCommand<WireMatch[]>(sessionId, '/matches/regenerate', {
    body: { operationId: crypto.randomUUID(), expectedQueueRevision: read.queueRevision },
  })
  return accepted(matches.map(matchOf), `Queue regenerated · ${matches.length} rebuilt`)
}

export async function realMoveMatch(input: {
  sessionId: string
  matchId: string
  toIndex: number
  method?: 'arrow' | 'drop'
}) {
  const read = await lastRead(input.sessionId)
  const match = shownMatch(read, input.matchId)
  const from = shownWaiting(read).findIndex((m) => m.id === match.id)
  const { position } = await queueCommand<{ matchId: string; position: number }>(
    input.sessionId,
    `/matches/${encodeURIComponent(input.matchId)}/position`,
    { body: { toIndex: Math.trunc(input.toIndex), expectedQueueRevision: read.queueRevision } },
  )
  const to = position - 1
  return accepted(
    null,
    input.method === 'arrow' || (input.method === undefined && Math.abs(to - from) === 1)
      ? 'Queue order changed'
      : `Match ${match.matchNo} moved to #${position}`,
  )
}

function saveLineup(sessionId: string, matchId: string, lineup: MatchLineup, revision: string) {
  return queueCommand<WireMatch>(sessionId, `/matches/${encodeURIComponent(matchId)}`, {
    method: 'PATCH',
    body: { operationId: crypto.randomUUID(), lineup, expectedQueueRevision: revision },
  })
}

export async function realUpdateMatchLineup(input: {
  sessionId: string
  matchId: string
  lineup: MatchLineup
}) {
  const read = await lastRead(input.sessionId)
  const match = await saveLineup(input.sessionId, input.matchId, input.lineup, read.queueRevision)
  return accepted(matchOf(match), 'Lineup saved · protected from regeneration')
}

/** Switch sides is a lineup edit of the shown match (one player from each team trades places). */
export async function realSwapPlayers(input: {
  sessionId: string
  matchId: string
  a: string
  b: string
}) {
  const read = await lastRead(input.sessionId)
  const m = shownMatch(read, input.matchId)
  if (m.state !== 'waiting')
    throw new MockError('permission', 'Only a waiting match can be changed.')
  const a = m.teamA.includes(input.a) ? input.a : input.b,
    b = m.teamB.includes(input.b) ? input.b : input.a
  if (a === b || !m.teamA.includes(a) || !m.teamB.includes(b))
    throw new MockError('permission', 'Choose one player from each team.')
  const { roster } = await realGetSessionRoster(input.sessionId)
  const pa = roster.find((p) => p.id === input.a),
    pb = roster.find((p) => p.id === input.b)
  if (!pa || !pb) throw new MockError('permission', 'Player not available.')
  const lineup: MatchLineup = {
    format: m.format,
    teamA: m.teamA.map((id) => (id === a ? b : id)),
    teamB: m.teamB.map((id) => (id === b ? a : id)),
  }
  await saveLineup(input.sessionId, m.id, lineup, read.queueRevision)
  return accepted(
    null,
    `Match ${m.matchNo}: ${shortName(pa)} and ${shortName(pb)} switched sides · protected from regeneration`,
  )
}

export async function realRemoveWaitingMatch(input: { sessionId: string; matchId: string }) {
  const read = await lastRead(input.sessionId)
  const match = shownMatch(read, input.matchId)
  await queueCommand<null>(input.sessionId, `/matches/${encodeURIComponent(match.id)}`, {
    method: 'DELETE',
    body: { expectedQueueRevision: read.queueRevision },
  })
  return accepted(null, `Waiting match ${match.matchNo} removed`)
}

/** Match control keeps the screen's operation ID, so a retry returns the first outcome. */
function requireOperationId(operationId: string) {
  if (!operationId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
}

/** Court labels are read before the command, so a failed read sends nothing. */
async function controlContext(matchId: string) {
  const sessionId = sessionOf(matchId)
  const { courts } = await realGetQueueSession(sessionId)
  return { sessionId, courts }
}

export async function realStartMatch(input: {
  matchId: string
  courtIds: string[]
  operationId: string
}) {
  requireOperationId(input.operationId)
  const { sessionId, courts } = await controlContext(input.matchId)
  const match = matchOf(
    await queueCommand<WireMatch>(
      sessionId,
      `/matches/${encodeURIComponent(input.matchId)}/start`,
      {
        body: { operationId: input.operationId, courtIds: input.courtIds },
      },
    ),
  )
  return accepted(null, `Match ${match.matchNo} started on ${courtNames(match, courts)}`)
}

type Decided = { match: WireMatch; decision: { winningTeam: 'A' | 'B' | null } }

export async function realCompleteMatch(input: {
  matchId: string
  winningTeam?: 'A' | 'B' | null
  teamAScore?: number | null
  teamBScore?: number | null
  operationId: string
}) {
  requireOperationId(input.operationId)
  const { sessionId, courts } = await controlContext(input.matchId)
  const { match, decision } = await queueCommand<Decided>(
    sessionId,
    `/matches/${encodeURIComponent(input.matchId)}/result`,
    {
      body: {
        operationId: input.operationId,
        winningTeam: input.winningTeam ?? null,
        teamAScore: input.teamAScore ?? null,
        teamBScore: input.teamBScore ?? null,
      },
    },
  )
  const m = matchOf(match)
  return accepted(
    null,
    `Team ${decision.winningTeam} wins match ${m.matchNo} · ${courtNames(m, courts)} free`,
  )
}

export async function realInvalidateMatch(input: { matchId: string; operationId: string }) {
  requireOperationId(input.operationId)
  const { sessionId, courts } = await controlContext(input.matchId)
  const { match } = await queueCommand<Decided>(
    sessionId,
    `/matches/${encodeURIComponent(input.matchId)}/invalid`,
    { body: { operationId: input.operationId } },
  )
  const m = matchOf(match)
  return accepted(null, `Match ${m.matchNo} marked invalid · ${courtNames(m, courts)} free`)
}

export async function realSubstitutePlayer(input: {
  matchId: string
  outId: string
  inId: string
  operationId: string
}) {
  requireOperationId(input.operationId)
  const sessionId = sessionOf(input.matchId)
  const { roster } = await realGetSessionRoster(sessionId)
  const incoming = roster.find((p) => p.id === input.inId),
    out = roster.find((p) => p.id === input.outId)
  if (!incoming || !out)
    throw new MockError('conflict', 'Something changed. Review the match again.')
  await queueCommand<WireMatch>(
    sessionId,
    `/matches/${encodeURIComponent(input.matchId)}/substitution`,
    { body: { operationId: input.operationId, outId: input.outId, inId: input.inId } },
  )
  return accepted(null, `${shortName(incoming)} in for ${shortName(out)}`)
}

// ---------- Results and publication (Q-RESULTS, Q-PUBLISH) ----------

type WireResults = {
  snapshot: {
    calculationVersion: string
    standings: SessionResultSnapshot['standings']
    awards: Omit<SessionResultSnapshot['awards'], 'offDay'>
    offDay: SessionResultSnapshot['awards']['offDay'] | null
    generatedAt: string
  } | null
  publication: {
    state: 'details' | 'published' | 'deleted'
    publishedSlides: SessionPublication['publishedSlides']
    includeOffDay: boolean
    publishedAt: string | null
  } | null
} | null

const readResults = (sessionId: string) =>
  realRequest<WireResults>(`${sessionPath(sessionId)}/results`)

/** The private snapshot; null until the finalization's slide stage saved one, and for invalid sessions. */
export async function realGetSessionResults(
  sessionId: string,
): Promise<SessionResultSnapshot | null> {
  const snapshot = (await readResults(sessionId))?.snapshot
  if (!snapshot) return null
  return {
    sessionId,
    standings: snapshot.standings,
    awards: { ...snapshot.awards, offDay: snapshot.offDay ?? [] },
    calculationVersion: snapshot.calculationVersion as SessionResultSnapshot['calculationVersion'],
    generatedAt: msOf(snapshot.generatedAt),
  }
}

/** The current publication, or null while results are private (or the page was removed). */
export async function realGetSessionPublication(
  sessionId: string,
): Promise<SessionPublication | null> {
  const publication = (await readResults(sessionId))?.publication
  if (publication?.state !== 'published' || !publication.publishedAt) return null
  return {
    sessionId,
    publishedSlides: publication.publishedSlides,
    includeOffDay: publication.includeOffDay,
    publishedAt: msOf(publication.publishedAt),
  }
}

const SLIDE_LABELS = { standings: 'Standings', awards: 'Awards' } as const

/** Online only. Each publish is its own command; Off Day is sent only as this call chose it. */
export async function realPublishResults(input: PublishResultsInput) {
  const { title } = await realGetQueueSession(input.sessionId)
  const done = await realRequest<{
    slides: SessionPublication['publishedSlides']
    includeOffDay: boolean
    publishedAt: string
  }>(`${sessionPath(input.sessionId)}/results/publication`, {
    method: 'POST',
    body: {
      commandId: crypto.randomUUID(),
      slides: [...new Set(input.publishedSlides)].sort(),
      includeOffDay: input.includeOffDay === true,
    },
  })
  const publication: SessionPublication = {
    sessionId: input.sessionId,
    publishedSlides: [...done.slides].sort(),
    includeOffDay: done.includeOffDay,
    publishedAt: msOf(done.publishedAt),
  }
  const published = [
    ...publication.publishedSlides.map((s) => SLIDE_LABELS[s]),
    ...(publication.includeOffDay ? ['Off Day'] : []),
  ]
  return accepted(publication, `${title}: ${published.join(', ')} published`)
}

// ---------- Mark session invalid (Q-DONE) ----------

export async function realInvalidateSession(input: { sessionId: string; reason: string }) {
  if (!input.reason.trim())
    throw new MockError('permission', 'Give the reason this session is invalid.')
  const session = await realGetQueueSession(input.sessionId)
  const done = await realRequest<{ state: 'invalid'; invalidReason: string | null }>(
    `${sessionPath(input.sessionId)}/invalid`,
    { method: 'POST', body: { reason: input.reason.trim() } },
  )
  return accepted(
    { ...session, state: done.state, invalidReason: done.invalidReason },
    `${session.title} marked invalid · no official result`,
  )
}
