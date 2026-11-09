import { FORMAT_LABELS, type MatchContext, matchStatus, shortName } from '../match/match.rules'
import type { Match, MatchFormat, MatchStatus } from '../match/match.types'
import type { MockState } from '../mock/store'
import type { PlayingLevel } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'
import { clubPlayers, storyIdentityPlayers } from './players'

/** One player as a queue card draws them: full name for the label, short name under the picture. */
export type MatchCardPlayerFixture = {
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
}

/** A waiting match with its status already worked out, ready for a MatchCard story. */
export type MatchCardFixture = {
  match: Match
  formatLabel: string
  status: MatchStatus
  teamA: MatchCardPlayerFixture[]
  teamB: MatchCardPlayerFixture[]
}

/**
 * Story-only queue cards built from the console fixtures: one per status, one per origin, a 5v5
 * that needs two free courts, and a lineup with long names. The normal store starts with no matches.
 */
export function createMatchCardFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)
  const ctx: MatchContext = {
    roster: scenario.roster,
    matches: scenario.matches,
    courts: scenario.courts,
  }
  const pid = (i: number) => {
    const p = scenario.roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const waiting = (n: number) => {
    const m = scenario.matches.find((x) => x.matchNo === n)
    if (!m || m.state !== 'waiting') throw new Error(`Missing waiting match ${n}.`)
    return m
  }
  const player = (roster: SessionPlayer[]) => (id: string) => {
    const p = roster.find((x) => x.id === id)
    if (!p) throw new Error('Missing roster fixture.')
    return { id: p.id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
  }
  const card = (match: Match, context: MatchContext = ctx): MatchCardFixture => ({
    match,
    formatLabel: FORMAT_LABELS[match.format],
    status: matchStatus(match, context),
    teamA: match.teamA.map(player(context.roster)),
    teamB: match.teamB.map(player(context.roster)),
  })

  // #2 waits on Jose, who is playing on Court 1; #3 can start; #4 has an absent player.
  const blocked = card(waiting(2)),
    ready = card(waiting(3)),
    needsAttention = card(waiting(4))
  const suggested = card({
      ...ready.match,
      id: 'console-match-suggested',
      matchNo: 8,
      queuePosition: 8,
      origin: 'suggested',
      manualProtected: false,
    }),
    auto = card({
      ...ready.match,
      id: 'console-match-auto',
      matchNo: 9,
      queuePosition: 9,
      origin: 'auto',
      manualProtected: false,
    })

  // 5v5 needs two free courts: with only two courts and one game on, one is free.
  const everyonePresent = scenario.roster.map((p) => ({ ...p, present: true }))
  const waitingForCourts = card(
    {
      ...ready.match,
      id: 'console-match-5v5',
      matchNo: 10,
      queuePosition: 10,
      format: 'fun_5v5',
      teamA: [4, 5, 6, 7, 8].map(pid),
      teamB: [9, 10, 11, 12, 13].map(pid),
    },
    { ...ctx, roster: everyonePresent, courts: scenario.courts.slice(0, 2) },
  )

  const longNames = card(ready.match, {
    ...ctx,
    roster: scenario.roster.map((p, i) =>
      i === 4
        ? {
            ...p,
            nameSnapshot: 'Maria Consolacion Villanueva-Bautista',
            nicknameSnapshot: 'Consolacion the smash machine',
          }
        : i === 7
          ? { ...p, nameSnapshot: 'Bartholomew Dimaculangan', nicknameSnapshot: null }
          : p,
    ),
  })

  /** The queue as the Session view's upcoming row shows it, in queue order. */
  const upcoming = [ready, needsAttention, blocked, suggested, auto, waitingForCourts].map(
    (c, i) => ({
      ...c,
      match: { ...c.match, queuePosition: i + 1 },
    }),
  )

  // Five ready candidates for slider stories; the prepared Sunday Night Queue starts empty.
  const sliderCandidates = Array.from({ length: 5 }, (_, i) => ({
    ...ready,
    match: { ...ready.match, id: `slider-match-${i + 1}`, matchNo: 20 + i, queuePosition: i + 1 },
  }))

  return {
    ready,
    sliderCandidates,
    needsAttention,
    blocked,
    waitingForCourts,
    suggested,
    auto,
    protectedManual: ready,
    longNames,
    upcoming,
  }
}

export const matchCardFixtures = createMatchCardFixtures()

/**
 * The Full house scenario's waiting queue (change log 2026-11-09-queue-public-queue-rows): ten
 * matches of mixed sizes, in this order, as team sizes (A, B).
 */
export const FULL_HOUSE_QUEUE_SIZES: readonly (readonly [number, number])[] = [
  [3, 3],
  [5, 5],
  [1, 2],
  [4, 4],
  [2, 2],
  [1, 1],
  [1, 2],
  [3, 3],
  [2, 2],
  [4, 4],
]

const FORMAT_BY_SIZES: Record<string, MatchFormat> = {
  '1,1': 'singles',
  '2,2': 'doubles',
  '1,2': 'fun_1v2',
  '3,3': 'fun_3v3',
  '4,4': 'fun_4v4',
  '5,5': 'fun_5v5',
}

/**
 * Public session page scenario for the signed-in read (Q17.3): tonight's live session with Court 1
 * Playing (Jose's match), Court 2 Getting ready, Courts 3 and 4 Free, the ten-match mixed queue,
 * a walk-in guest on the roster, and a waitlist of two registered players and an unclaimed
 * profile. `mergedMatches` swaps Courts 1 and 2 for one Playing 5 v 5 on merged courts.
 * `clubPlayers` are the guest and unclaimed records the store does not seed. Story and mock use
 * only; the normal store starts with no matches (`applyFullHouseFixtures`).
 */
export function createFullHouseFixtures(now = Date.now()) {
  const base = createConsoleFixtures(now)
  const { session } = base
  const { guest, unclaimed } = storyIdentityPlayers
  // A walk-in guest sits at the end of the roster so the masked case shows next to registered names.
  const guestRow = {
    id: 'full-house-player-guest',
    sessionId: session.id,
    clubPlayerId: guest.id,
    nameSnapshot: guest.fullName,
    nicknameSnapshot: null,
    present: true,
    presentChangedAt: session.startedAt,
    level: null,
    levelLockedAt: null,
    confirmedAt: now + 100,
  }
  const roster = [...base.roster, guestRow]
  const courts = base.courts.map((c) => ({ ...c, openUntil: null }))
  // Queue and court teams draw from the console's 17 registered players, never the guest.
  const pid = (i: number) => {
    const p = base.roster[i % base.roster.length]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const court = (i: number) => {
    const c = courts[i]
    if (!c) throw new Error('Missing court fixture.')
    return c.id
  }
  const [playing] = base.matches
  if (!playing) throw new Error('Missing playing match fixture.')
  const onCourt: Match = {
    ...playing,
    id: 'full-house-getting-ready',
    matchNo: 2,
    queuePosition: 2,
    state: 'on_court',
    teamA: [4, 6].map(pid),
    teamB: [7, 8].map(pid),
    courtIds: [court(1)],
    placedAt: now - 120000,
    startedAt: null,
  }
  const playingNow: Match = { ...playing, startedAt: now - 18 * 60000, courtIds: [court(0)] }
  // Everyone cycles through the same pool, so no match names one player twice (pool 17 >= 10).
  const pool = [9, 10, 11, 12, 13, 14, 15, 16, 4, 5, 6, 7, 8, 0, 1, 2, 3]
  let offset = 0
  const queue: Match[] = FULL_HOUSE_QUEUE_SIZES.map(([a, b], i) => {
    const ids = Array.from({ length: a + b }, (_, j) => pid(pool[(offset + j) % pool.length] ?? 0))
    offset += a + b
    return {
      ...playing,
      id: `full-house-waiting-${i + 1}`,
      matchNo: i + 3,
      queuePosition: i + 1,
      state: 'waiting',
      format: FORMAT_BY_SIZES[`${a},${b}`] ?? 'doubles',
      origin: 'auto',
      manualProtected: false,
      teamA: ids.slice(0, a),
      teamB: ids.slice(a),
      courtIds: [],
      startedAt: null,
      endedAt: null,
      decision: null,
    }
  })
  const onRoster = new Set(roster.map((r) => r.clubPlayerId))
  const waiting = [...clubPlayers.filter((p) => !onRoster.has(p.id)).slice(0, 2), unclaimed]
  const waitlist = waiting.map((p, i) => ({
    id: `full-house-wait-${i + 1}`,
    sessionId: session.id,
    clubPlayerId: p.id,
    level: p.playingLevel,
    addedAt: now - (waiting.length - i) * 7 * 60000,
  }))
  const merged: Match = {
    ...playingNow,
    id: 'full-house-merged',
    format: 'fun_5v5',
    teamA: [0, 1, 2, 3, 4].map(pid),
    teamB: [6, 7, 8, 9, 10].map(pid),
    courtIds: [court(0), court(1)],
  }
  return {
    session,
    roster,
    courts,
    waitlist,
    clubPlayers: [guest, unclaimed],
    matches: [playingNow, onCourt, ...queue],
    mergedMatches: [merged, ...queue],
  }
}

/**
 * Installs the Full house scenario into the mock store for tonight's session (same slug, so
 * `/s/<slug>` shows it). Call inside `mockStore.update`.
 */
export function applyFullHouseFixtures(
  draft: MockState,
  options: { now?: number; merged?: boolean } = {},
) {
  const f = createFullHouseFixtures(options.now)
  const sessionId = f.session.id
  for (const p of f.clubPlayers)
    if (!draft.clubPlayers.some((x) => x.id === p.id)) draft.clubPlayers.push(p)
  draft.sessions = draft.sessions.map((s) => (s.id === sessionId ? f.session : s))
  draft.courts = [...draft.courts.filter((c) => c.sessionId !== sessionId), ...f.courts]
  draft.roster = [...draft.roster.filter((r) => r.sessionId !== sessionId), ...f.roster]
  draft.waitlist = [...draft.waitlist.filter((w) => w.sessionId !== sessionId), ...f.waitlist]
  draft.matches = [
    ...draft.matches.filter((m) => m.sessionId !== sessionId),
    ...(options.merged ? f.mergedMatches : f.matches),
  ]
}
