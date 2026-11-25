import { type LevelRestriction, levelRestrictionOf } from '@rotra/schema/level-restriction'
import { type ScoringKey, scoringOf } from '@rotra/schema/scoring'
export type SessionMode = 'chill' | 'fair' | 'hard'
/** The Manual Queue | Auto Queue switch. Auto places the next ready match On court; it never starts one. */
export type CourtFillMode = 'manual' | 'auto'
export type QueueSession = {
  id: string
  clubId: string
  title: string
  notes: string
  scheduledStartAt: number
  scheduledEndAt: number
  venueId: string
  venueName: string
  venueAddress: string
  /** `cancelled`: only from prepared, before start; final. */
  state: 'prepared' | 'active' | 'finalizing' | 'completed' | 'invalid' | 'cancelled'
  invalidReason: string | null
  /** Set exactly when cancelled. Missing on sessions made before Cancel session existed. */
  cancelledAt?: number | null
  /** Optional reason, up to 120 characters; only when cancelled. */
  cancelReason?: string | null
  sessionMode: SessionMode
  allowSingles: boolean
  allowDoubles: boolean
  minimumGames: number
  minimumIsCalculated: boolean
  playersPerCourt: number
  expectedPlayers: number | null
  startedAt: number | null
  finalizedAt: number | null
  playerRecordsUpdatedAt: number | null
  seriesId: string | null
  publicSlug: string
  acceptJoinRequests: boolean
  /**
   * **Always require a request** (D-2026-11-12-02, #764): when true, club members send a join request
   * like everyone else; when false (the default) a club member joins an upcoming session right away.
   * Read as false while `acceptJoinRequests` is off.
   */
  alwaysRequireRequest: boolean
  /** Missing means `manual` (the default). */
  courtFillMode?: CourtFillMode
  /**
   * **Players can request**: which formats a signed-in Player may ask for with Request a match.
   * Missing means `prototypeDefaultRequestFormats(session)` (sessions saved before the setting).
   */
  requestFormats?: RequestFormats
  /**
   * **Record games** (D-2026-11-20-02): false records the games as usual but keeps the session's
   * wins out of the ROTRA leaderboards and win rate ("Not ranked"). Missing means true (sessions
   * saved before the switch). Read it through `recordsGames`. Fixed once started.
   */
  recordGames?: boolean
  /**
   * **Scoring** (Q22, D-2026-11-18-04): how games are scored; the match result check follows it.
   * Missing means 16/31 (sessions saved before the setting). Read it through `sessionScoring`.
   * Fixed once started.
   */
  scoring?: ScoringKey
  /**
   * **Restrictions** (D-2026-11-19-12): which levels may take a slot. Missing means All levels
   * (sessions saved before the setting). Read it through `sessionLevelRestriction`; the allowed /
   * full check is `levelRestrictionBlock` in `session-roster/levelRestriction.rules`.
   */
  levelRestriction?: LevelRestriction
}
/** The session's level restriction: the stored pick, or All levels when missing or unknown. */
export const sessionLevelRestriction = (
  session: Pick<QueueSession, 'levelRestriction'> | null | undefined,
) => levelRestrictionOf(session?.levelRestriction)
/** The session's scoring mode: the stored value, or 16/31 when missing or unknown. */
export const sessionScoring = (session: Pick<QueueSession, 'scoring'> | null | undefined) =>
  scoringOf(session?.scoring)
/**
 * Whether the session's wins count toward the ROTRA leaderboards and win rate: the one place the
 * Record games default lives (missing reads as on). With it off the session is "Not ranked", but
 * its games, results, standings, awards and result slides are kept as usual.
 */
export const recordsGames = (session: Pick<QueueSession, 'recordGames'>) =>
  session.recordGames !== false
/** One switch per format a Player may request (`MatchFormat` keys). */
export type RequestFormats = Record<import('../match/match.types').MatchFormat, boolean>
/**
 * The default for **Players can request** (owner's option A): 2 v 2 is on, 1 v 1 follows the Singles
 * switch, and 1 v 2, 3 v 3, 4 v 4 and 5 v 5 are off. New sessions start here, and a session saved
 * before the setting existed (no `requestFormats`) resolves to it until it is edited. The one place
 * this default lives.
 */
export const prototypeDefaultRequestFormats = (
  session: Pick<QueueSession, 'allowSingles'>,
): RequestFormats => ({
  doubles: true,
  singles: session.allowSingles,
  fun_1v2: false,
  fun_3v3: false,
  fun_4v4: false,
  fun_5v5: false,
})
export type SessionCourt = {
  id: string
  sessionId: string
  /** May repeat within a session (owner decision, 2026-11-25). */
  label: string
  /**
   * Court order in the session, from 1 (owner decision, 2026-11-25), set by Reorder courts in
   * Settings. Every court list and Auto Queue's fill follow it; see `byCourtOrder`.
   */
  position: number
  /** Older fixtures without a start are already open. New bookings always set it. */
  startsAt?: number
  /** When the Queue Master opened the court before its planned start (Start anyway); missing or null when not. `startsAt` keeps the booking. */
  openedEarlyAt?: number | null
  openUntil: number | null
  removedAt: number | null
}
/**
 * Court order (owner decision, 2026-11-25): position, then the given order (a stable sort keeps
 * the order the courts were read in on a tie). Sort a session's courts with it wherever they are read.
 */
export const byCourtOrder = (
  a: Pick<SessionCourt, 'position'>,
  b: Pick<SessionCourt, 'position'>,
) => a.position - b.position
/**
 * Which court a reorder moved, for the toast "COURT moved to position N" (2026-11-25 mockup log):
 * the court whose move alone turns `beforeIds` into `afterIds`; when two could (two neighbours
 * swapped), the one now earlier. A reorder that is not one move names the first court whose place
 * changed. Null when the order is the same.
 */
export function movedCourt(
  beforeIds: readonly string[],
  afterIds: readonly string[],
): { courtId: string; position: number } | null {
  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id, i) => b[i] === id)
  if (same(beforeIds, afterIds)) return null
  const without = (ids: readonly string[], id: string) => ids.filter((x) => x !== id)
  const id =
    afterIds.find((id) => same(without(beforeIds, id), without(afterIds, id))) ??
    afterIds.find((id, i) => beforeIds[i] !== id)
  return id ? { courtId: id, position: afterIds.indexOf(id) + 1 } : null
}
export const courtMovedText = (label: string, position: number) =>
  `${label} moved to position ${position}`
export type DownloadState = 'none' | 'downloading' | 'ready'
export type QueueSessionSummary = QueueSession & {
  courtsInUse: number
  gamesPlayed: number
  presentCount: number
  rosterCount: number
  capacity: number
  waitlistCount: number
  queuedCount: number
  /** `null` means this data mode has no device-download adapter yet. */
  downloadedHere: boolean | null
  /**
   * Before Start, Requests · N (pending join requests + open drop-out notices); once live, Match
   * requests · N (open match requests only). Carried by the session detail read. Missing where the
   * read does not include it (lists, real mode).
   */
  requestCount?: number
}
export type QueueSessionInput = Pick<
  QueueSession,
  | 'title'
  | 'notes'
  | 'venueId'
  | 'scheduledStartAt'
  | 'scheduledEndAt'
  | 'sessionMode'
  | 'allowSingles'
  | 'allowDoubles'
  | 'minimumGames'
  | 'minimumIsCalculated'
  | 'expectedPlayers'
  | 'requestFormats'
  | 'recordGames'
  | 'scoring'
  | 'levelRestriction'
> & {
  costEstimate?: import('../session-cost/sessionCost.types').SessionCostInput | null
  playersPerCourt?: number
  courts: { label: string; startsAt?: number; openUntil?: number | null }[]
  repeat?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  occurrences?: number
  /**
   * Q-SETUP › Hosts (#1004, D-2026-11-22-01): the saved players (club player ids) hosting the
   * session after this save, in the order picked. Every date of a series gets the same hosts. New
   * hosts must be trusted hosts; each is registered as a player (a slot, or the waitlist once full)
   * unless already registered. Left out = hosts unchanged; [] = no hosts.
   */
  hostClubPlayerIds?: string[]
}
/** Q-SESSION-DONE read model; the pending count is the same one that drives the SyncStatus pill. */
export type SessionDoneReview = {
  sessionId: string
  gamesRecorded: number
  participants: number
  pendingChanges: number
  activeGames: { matchId: string; courtLabels: string[] }[]
  /** On court matches that were never started: dropped at Session done like waiting ones */
  onCourtDropped: number
  unplayedWaiting: number
  belowMinimum: { clubPlayerId: string; name: string; completedGames: number }[]
  minimum: number
  /**
   * Guest review at Session done (D-2026-11-07-03, #722): roster players with no ROTRA identity
   * (a guest the club entered by name), each with the club's saved players whose name matches, as
   * lightweight candidates. The Queue Master confirms a match or creates a new unclaimed player;
   * nothing is linked by name. Missing where the read does not include it (mock mode).
   */
  unresolvedGuests?: UnresolvedGuest[]
}
export type UnresolvedGuest = {
  clubPlayerId: string
  sessionPlayerId: string
  name: string
  candidates: {
    clubPlayerId: string
    name: string
    identity: 'registered' | 'unclaimed'
    rtrId: string | null
  }[]
}
export type FinalizationStage = 'checking' | 'finishing' | 'player_records' | 'slides'
export const FINALIZATION_STAGES: readonly FinalizationStage[] = [
  'checking',
  'finishing',
  'player_records',
  'slides',
]
/**
 * One finalization per session; `committed` means the session is complete but later work failed.
 */
export type SessionFinalization = {
  sessionId: string
  commandId: string
  state: 'running' | 'committed' | 'done' | 'failed'
  stage: FinalizationStage
  failedStage?: FinalizationStage
}
export type SessionDoneBlocker =
  | 'offline'
  | 'pending_changes'
  | 'games_in_play'
  | 'incomplete_records'
  | 'authorization'
/** Q-HISTORY read model; an invalid session has no games, standings or counted players. */
export type SessionRecordSummary = {
  sessionId: string
  title: string
  state: 'completed' | 'invalid'
  invalidReason: string | null
  scheduledStartAt: number
  scheduledEndAt: number
  startedAt: number | null
  finalizedAt: number | null
  playerRecordsUpdatedAt: number | null
  venueName: string
  venueAddress: string
  /** False when not ranked: games and results are recorded as usual. Missing: true. */
  recordGames?: boolean
  games: number
  invalidGames: number
  players: number
  courts: number
  lengthMinutes: number
  minimumGames: number
  belowMinimumCount: number
  playerSummaries: {
    sessionPlayerId: string
    clubPlayerId: string
    name: string
    level: import('../player/player.types').PlayingLevel | null
    completedGames: number
    wins: number
    losses: number
  }[]
}
