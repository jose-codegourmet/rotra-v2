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
  /** Missing means `manual` (the default). */
  courtFillMode?: CourtFillMode
  /**
   * **Players can request**: which formats a signed-in Player may ask for with Request a match.
   * Missing means `prototypeDefaultRequestFormats(session)` (sessions saved before the setting).
   */
  requestFormats?: RequestFormats
}
/** One switch per format a Player may request (`MatchFormat` keys). */
export type RequestFormats = Record<import('../match/match.types').MatchFormat, boolean>
/**
 * PROTOTYPE DEFAULT, NOT AN OWNER DECISION (D-2026-11-09-11 is Open): 2 v 2 follows the Doubles
 * switch, 1 v 1 follows the Singles switch, every fun format is off (the prototype's `reqDefaults`).
 * The one place this default lives; Q18.14 (#618) owns the setup toggles and the decided default.
 */
export const prototypeDefaultRequestFormats = (
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
): RequestFormats => ({
  doubles: session.allowDoubles,
  singles: session.allowSingles,
  fun_1v2: false,
  fun_3v3: false,
  fun_4v4: false,
  fun_5v5: false,
})
export type SessionCourt = {
  id: string
  sessionId: string
  label: string
  /** Older fixtures without a start are already open. New bookings always set it. */
  startsAt?: number
  /** When the Queue Master opened the court before its planned start (Start anyway); missing or null when not. `startsAt` keeps the booking. */
  openedEarlyAt?: number | null
  openUntil: number | null
  removedAt: number | null
}
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
   * Requests · N (pending join requests + open drop-out notices + open match requests), carried by
   * the session detail read. Missing where the read does not include it (lists, real mode).
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
> & {
  costEstimate?: import('../session-cost/sessionCost.types').SessionCostInput | null
  playersPerCourt?: number
  courts: { label: string; startsAt?: number; openUntil?: number | null }[]
  repeat?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  occurrences?: number
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
}
export type FinalizationStage = 'checking' | 'finishing' | 'player_records' | 'slides'
export const FINALIZATION_STAGES: readonly FinalizationStage[] = [
  'checking',
  'finishing',
  'player_records',
  'slides',
]
/** One finalization per session; `committed` means the session is complete but later work failed. */
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
