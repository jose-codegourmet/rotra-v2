export type SessionMode = 'chill' | 'fair' | 'hard'
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
  state: 'prepared' | 'active' | 'finalizing' | 'completed' | 'invalid'
  invalidReason: string | null
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
}
export type SessionCourt = {
  id: string
  sessionId: string
  label: string
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
  downloadedHere: boolean
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
  courts: { label: string; openUntil?: number | null }[]
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
export type SessionDoneBlocker = 'offline' | 'pending_changes' | 'games_in_play' | 'incomplete_records'
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
