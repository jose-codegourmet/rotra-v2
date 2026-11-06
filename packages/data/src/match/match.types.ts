export type MatchFormat = 'singles' | 'doubles' | 'fun_1v2' | 'fun_3v3' | 'fun_4v4' | 'fun_5v5'
export type MatchOrigin = 'manual' | 'suggested' | 'auto'
/** waiting → on_court (placed, not started; players busy, court held) → active (Playing) → completed | invalid */
export type MatchState = 'waiting' | 'on_court' | 'active' | 'completed' | 'invalid'
/** Who gets the game after an in-game substitution: session counting only, never rank. */
export type SubstitutionCredit = 'none' | 'incoming' | 'outgoing'
export type Match = {
  id: string
  sessionId: string
  matchNo: number
  state: MatchState
  format: MatchFormat
  queuePosition: number
  origin: MatchOrigin
  manualProtected: boolean
  teamA: string[]
  teamB: string[]
  courtIds: string[]
  /** When it went On court; null once sent back. Missing on matches made before the On court step. */
  placedAt?: number | null
  /** Set only at Start match, never at placement. */
  startedAt: number | null
  endedAt: number | null
  substitutions: {
    outId: string
    inId: string
    team: 'A' | 'B'
    at: number
    /** Missing means `none`. Stored on the incoming player's participation row; frozen at done/invalid. */
    creditTo?: SubstitutionCredit
  }[]
  decision: {
    kind: 'completed' | 'invalid'
    winningTeam: 'A' | 'B' | null
    teamAScore: number | null
    teamBScore: number | null
    confirmedAt: number
  } | null
}
export type MatchStatus = {
  kind: 'ready' | 'needs-attention' | 'blocked' | 'waiting-for-courts'
  reason: string
}
export type MatchLineup = Pick<Match, 'format' | 'teamA' | 'teamB'>
