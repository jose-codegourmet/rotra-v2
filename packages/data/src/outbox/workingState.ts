import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { CLUB_PATHS, sessionPathOf } from '../device/deviceCopy'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import type { Match } from '../match/match.types'
import type { MockState } from '../mock/store'
import type { PlayingLevel } from '../player/player.types'
import { sessionSummary } from '../queue-session/fetchers'
import type { QueueSession } from '../queue-session/queueSession.types'
import { minorOf, msOf } from '../real/client'
import type { WirePayments } from '../real/financials'
import { matchOf, type WireMatch } from '../real/match'
import {
  courtOf,
  rosterReadOf,
  summaryOf,
  type WireClubPlayer,
  type WireCourt,
  type WireRosterEntry,
  type WireRosterRead,
  type WireSessionSummary,
  type WireWaitlistEntry,
} from '../real/queue'
import { salesSettingsSeed } from '../sales/sales.fixtures'
import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import { paymentTotals } from '../session-payment/sessionPayment.rules'
import type { SessionPaymentMark } from '../session-payment/sessionPayment.types'
import type { SessionPlayer, SessionWaitlistEntry } from '../session-roster/sessionRoster.types'

/**
 * The offline working state (#722): the downloaded copy's GET bodies turned into the `MockState`
 * the existing reducers know, and back into the bodies the screens read once a reducer ran. Only
 * the paths a Queue Master's offline write can change are written back: the session (and its entry
 * in the session list), matches, roster, payments and the club's saved players (new guests).
 */

export type Bodies = ReadonlyMap<string, unknown>

const iso = (ms: number) => new Date(ms).toISOString()
const isoOrNull = (ms: number | null | undefined) => (ms == null ? null : iso(ms))

/** Every `MockState` field, empty: the reducers only touch what the copy fills in. */
export function emptyWorkingState(now = Date.now()): MockState {
  return {
    passwordResetRequests: [],
    adminPlayerRecords: {},
    inventory: [],
    costEstimates: {},
    paymentMarks: [],
    playerAccounts: [],
    resetLinks: {},
    claimLinks: {},
    contactChangeRequests: [],
    playerProfiles: [],
    playerRanks: {},
    playerGames: {},
    rankingPolicyVersions: [],
    clubs: [],
    clubAccounts: [],
    clubNameChangeRequests: [],
    adminClubRecords: [],
    adminAuditEvents: [],
    adminCommands: {},
    featureFlags: [],
    profileCharacters: [],
    salesSettings: salesSettingsSeed,
    venues: [],
    players: [],
    clubPlayers: [],
    sessions: [],
    courts: [],
    roster: [],
    waitlist: [],
    joinRequests: [],
    dropOutNotices: [],
    matchRequests: [],
    sessionInviteCodes: [],
    licensePayments: [],
    clubRetentionRecords: [],
    downloads: {},
    downloadInfo: {},
    sync: {
      online: false,
      syncing: false,
      pendingCount: 0,
      lastSyncedAt: now,
      syncedCount: 0,
      log: [],
    },
    sessionIntegrity: {},
    autoQueueDrafts: {},
    matches: [],
    matchSequences: {},
    finalizations: {},
    awardHistory: [],
    resultSnapshots: {},
    publications: {},
    publicationEvents: [],
    operations: {},
    privatePhones: {},
    sampleRequestIndex: 0,
  }
}

export const sessionPaths = (sessionId: string) => {
  const base = sessionPathOf(sessionId)
  return {
    session: base,
    matches: `${base}/matches`,
    roster: `${base}/roster`,
    payments: `${base}/payments`,
    list: '/api/sessions',
    clubPlayers: '/api/club/players',
  }
}

const clubPlayerOf = (p: WireClubPlayer): ClubPlayer => ({
  id: p.id,
  clubId: DEMO_CLUB_ID,
  playerId: p.playerId,
  fullName: p.fullName,
  nickname: p.nickname,
  identity: p.identity,
  playingLevel: (p.playingLevel as PlayingLevel | null) ?? null,
  addedAt: msOf(p.addedAt),
})

export type WorkingState = { state: MockState; clubId: string }

/**
 * The working state for one downloaded session. The session and its saved players take the demo
 * club id, which is what `sessionIn` and the roster reducers check; `clubId` keeps the real one for
 * the way back. The copy must hold the session's own read.
 */
export function buildWorkingState(bodies: Bodies, sessionId: string): WorkingState | null {
  const paths = sessionPaths(sessionId)
  const head = bodies.get(paths.session) as WireSessionSummary | undefined
  if (!head) return null
  const state = emptyWorkingState()
  const summary = summaryOf(head, true)
  const session: QueueSession = { ...summary, clubId: DEMO_CLUB_ID }
  state.sessions.push(session)
  state.courts.push(...head.courts.map(courtOf))
  state.downloads[sessionId] = 'ready'

  const matches = bodies.get(paths.matches) as { matches: WireMatch[] } | undefined
  if (matches) state.matches.push(...matches.matches.map(matchOf))
  state.matchSequences[sessionId] = Math.max(0, ...state.matches.map((m) => m.matchNo))

  const roster = bodies.get(paths.roster) as WireRosterRead | undefined
  if (roster) {
    const read = rosterReadOf(roster)
    state.roster.push(...read.roster)
    state.waitlist.push(...read.waitlist)
    state.joinRequests.push(...read.joinRequests)
  }

  const players = bodies.get(paths.clubPlayers) as { players: WireClubPlayer[] } | undefined
  if (players) state.clubPlayers.push(...players.players.map(clubPlayerOf))
  // Roster players the club list does not carry (deleted saved players) still need a row.
  for (const r of state.roster)
    if (!state.clubPlayers.some((p) => p.id === r.clubPlayerId))
      state.clubPlayers.push({
        id: r.clubPlayerId,
        clubId: DEMO_CLUB_ID,
        playerId: null,
        fullName: r.nameSnapshot,
        nickname: r.nicknameSnapshot,
        identity: 'guest',
        playingLevel: r.level,
      })

  const payments = (bodies.get(paths.payments) as { payments: WirePayments | null } | undefined)
    ?.payments
  if (payments) {
    for (const player of payments.players)
      if (player.paid)
        state.paymentMarks.push({
          sessionId,
          sessionPlayerId: player.sessionPlayerId,
          amountMinor: minorOf(player.paid.amount) ?? payments.amountDue ?? 0,
          currency: 'PHP',
          markedAt: msOf(player.paid.at),
        })
    // A quick paid tick records the amount due: a custom estimate gives the reducers that number.
    if (payments.amountDue !== null) {
      const estimate: SessionCostEstimate = {
        sessionId,
        currency: 'PHP',
        courtFeePerCourtHour: null,
        entranceFeePerHead: null,
        shuttles: [],
        paymentMode: 'custom',
        customFeePerHead: payments.amountDue,
      }
      state.costEstimates[sessionId] = estimate
    }
  }
  return { state, clubId: head.session.clubId }
}

// ---------- Back to the wire ----------

const SESSION_DATES = new Set([
  'scheduledStartAt',
  'scheduledEndAt',
  'startedAt',
  'finalizedAt',
  'cancelledAt',
  'playerRecordsUpdatedAt',
])

/** The session as the GET returns it: every wire field the copy had, with the reducers' values. */
function wireSessionOf(
  original: WireSessionSummary['session'],
  session: QueueSession,
  clubId: string,
) {
  const out: Record<string, unknown> = { ...original }
  const domain = session as unknown as Record<string, unknown>
  for (const key of Object.keys(original)) {
    if (!(key in domain)) continue
    const value = domain[key]
    out[key] = SESSION_DATES.has(key) ? isoOrNull(value as number | null) : value
  }
  out.clubId = clubId
  return out as WireSessionSummary['session']
}

const wireCourtOf = (c: MockState['courts'][number]): WireCourt => ({
  id: c.id,
  sessionId: c.sessionId,
  label: c.label,
  startsAt: isoOrNull(c.startsAt),
  openedEarlyAt: isoOrNull(c.openedEarlyAt),
  openUntil: isoOrNull(c.openUntil),
  removedAt: isoOrNull(c.removedAt),
})

export function wireSessionSummaryOf(
  original: WireSessionSummary,
  { state, clubId }: WorkingState,
  sessionId: string,
): WireSessionSummary {
  const session = state.sessions.find((s) => s.id === sessionId)
  if (!session) return original
  const counts = sessionSummary(state, session)
  return {
    ...original,
    session: wireSessionOf(original.session, session, clubId),
    courts: state.courts.filter((c) => c.sessionId === sessionId).map(wireCourtOf),
    rosterCount: counts.rosterCount,
    presentCount: counts.presentCount,
    capacity: counts.capacity,
    waitlistCount: counts.waitlistCount,
    courtsInUse: counts.courtsInUse,
    gamesPlayed: counts.gamesPlayed,
    queuedCount: counts.queuedCount,
  }
}

export function wireMatchOf(m: Match, revision = '0'): WireMatch {
  return {
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
    placedAt: isoOrNull(m.placedAt),
    startedAt: isoOrNull(m.startedAt),
    endedAt: isoOrNull(m.endedAt),
    substitutions: m.substitutions.map((s) => ({ ...s, at: iso(s.at) })),
    decision: m.decision ? { ...m.decision, confirmedAt: iso(m.decision.confirmedAt) } : null,
    revision,
  }
}

function wireMatchesOf(
  original: { matches: WireMatch[]; queueRevision: string; revision: string },
  state: MockState,
  sessionId: string,
) {
  const revisions = new Map(original.matches.map((m) => [m.id, m.revision]))
  return {
    ...original,
    matches: state.matches
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.queuePosition - b.queuePosition)
      .map((m) => wireMatchOf(m, revisions.get(m.id))),
  }
}

const wireRosterEntryOf = (r: SessionPlayer): WireRosterEntry => ({
  id: r.id,
  sessionId: r.sessionId,
  clubPlayerId: r.clubPlayerId,
  nameSnapshot: r.nameSnapshot,
  nicknameSnapshot: r.nicknameSnapshot,
  present: r.present,
  presentChangedAt: iso(r.presentChangedAt ?? r.confirmedAt),
  level: r.level,
  levelLockedAt: isoOrNull(r.levelLockedAt),
  confirmedAt: iso(r.confirmedAt),
  ...(r.hasPlayedAtClubBefore === undefined
    ? {}
    : { hasPlayedAtClubBefore: r.hasPlayedAtClubBefore }),
  ...(r.gamesAdjustment === undefined ? {} : { gamesAdjustment: r.gamesAdjustment }),
})

function wireRosterOf(
  original: WireRosterRead,
  state: MockState,
  sessionId: string,
): WireRosterRead {
  const waitlist = state.waitlist
    .filter((w) => w.sessionId === sessionId)
    .sort((a, b) => a.addedAt - b.addedAt)
  return {
    ...original,
    roster: state.roster
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.confirmedAt - b.confirmedAt)
      .map(wireRosterEntryOf),
    waitlist: waitlist.map(
      (w: SessionWaitlistEntry, index): WireWaitlistEntry => ({
        id: w.id,
        sessionId: w.sessionId,
        clubPlayerId: w.clubPlayerId,
        level: w.level,
        addedAt: iso(w.addedAt),
        position: index + 1,
      }),
    ),
    joinRequests: state.joinRequests
      .filter((r) => r.sessionId === sessionId)
      .map((r) => ({
        ...r,
        requestedAt: iso(r.requestedAt),
        decidedAt: isoOrNull(r.decidedAt),
      })),
  }
}

function wirePaymentsOf(original: WirePayments, state: MockState, sessionId: string): WirePayments {
  const roster = state.roster.filter((r) => r.sessionId === sessionId)
  const markOf = (r: SessionPlayer): SessionPaymentMark | undefined =>
    state.paymentMarks.find((m) => m.sessionId === sessionId && m.sessionPlayerId === r.id)
  const marks = roster.map(markOf).filter((m): m is SessionPaymentMark => !!m)
  return {
    ...original,
    players: roster
      .map((r) => {
        const mark = markOf(r)
        return {
          sessionPlayerId: r.id,
          clubPlayerId: r.clubPlayerId,
          name: r.nameSnapshot,
          paid: mark
            ? { amount: { amountMinor: mark.amountMinor, currency: 'PHP' }, at: iso(mark.markedAt) }
            : null,
        }
      })
      .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name)),
    totals: paymentTotals({
      marks,
      total: roster.length,
      amountDue: original.amountDue,
      cost: original.totals.cost,
    }),
  }
}

function wireClubPlayersOf(
  original: { players: WireClubPlayer[] },
  { state, clubId }: WorkingState,
  sessionId: string,
) {
  const known = new Set(original.players.map((p) => p.id))
  const added = state.clubPlayers
    .filter((p) => !known.has(p.id) && !p.removedAt)
    // Only players the copy's session names: placeholder rows for deleted saved players stay out.
    .filter(
      (p) =>
        state.roster.some((r) => r.sessionId === sessionId && r.clubPlayerId === p.id) ||
        state.waitlist.some((w) => w.sessionId === sessionId && w.clubPlayerId === p.id),
    )
    .map(
      (p): WireClubPlayer => ({
        id: p.id,
        clubId,
        playerId: p.playerId,
        fullName: p.fullName,
        nickname: p.nickname,
        picture: null,
        pictureName: null,
        identity: p.identity,
        joinedVia: p.joinedVia ?? 'added',
        rtrId: null,
        playingLevel: p.playingLevel,
        phoneHidden: false,
        hasPhone: p.identity === 'pending',
        sessionsHere: 1,
        addedAt: iso(p.addedAt ?? Date.now()),
      }),
    )
  return added.length ? { ...original, players: [...original.players, ...added] } : original
}

/**
 * The bodies to write over after a reducer ran: only paths the copy holds, each rebuilt from the
 * working state. Paths the copy never kept (no roster read yet, say) are left out, never invented.
 */
export function changedBodiesOf(
  bodies: Bodies,
  working: WorkingState,
  sessionId: string,
): { path: string; body: unknown }[] {
  const paths = sessionPaths(sessionId)
  const out: { path: string; body: unknown }[] = []
  const head = bodies.get(paths.session) as WireSessionSummary | undefined
  if (head) {
    const summary = wireSessionSummaryOf(head, working, sessionId)
    out.push({ path: paths.session, body: summary })
    const list = bodies.get(paths.list) as { sessions: WireSessionSummary[] } | undefined
    if (list)
      out.push({
        path: paths.list,
        body: {
          ...list,
          sessions: list.sessions.map((s) => (s.session.id === sessionId ? summary : s)),
        },
      })
  }
  const matches = bodies.get(paths.matches) as
    | { matches: WireMatch[]; queueRevision: string; revision: string }
    | undefined
  if (matches)
    out.push({ path: paths.matches, body: wireMatchesOf(matches, working.state, sessionId) })
  const roster = bodies.get(paths.roster) as WireRosterRead | undefined
  if (roster) out.push({ path: paths.roster, body: wireRosterOf(roster, working.state, sessionId) })
  const payments = bodies.get(paths.payments) as { payments: WirePayments | null } | undefined
  if (payments?.payments)
    out.push({
      path: paths.payments,
      body: { ...payments, payments: wirePaymentsOf(payments.payments, working.state, sessionId) },
    })
  const players = bodies.get(paths.clubPlayers) as { players: WireClubPlayer[] } | undefined
  if (players) {
    const next = wireClubPlayersOf(players, working, sessionId)
    if (next !== players) out.push({ path: paths.clubPlayers, body: next })
  }
  return out
}

/** The paths a working state is built from: the session's reads and the club-level ones. */
export const workingStatePaths = (sessionId: string) => [
  ...Object.values(sessionPaths(sessionId)),
  ...CLUB_PATHS,
]
