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
  playersPerCourt?: number
  courts: { label: string; openUntil?: number | null }[]
  repeat?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  occurrences?: number
}
