export type MatchFormat = 'singles' | 'doubles' | 'fun_1v2' | 'fun_3v3' | 'fun_4v4' | 'fun_5v5'
export type MatchOrigin = 'manual' | 'suggested' | 'auto'
export type MatchState = 'waiting' | 'active' | 'completed' | 'invalid'
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
  startedAt: number | null
  endedAt: number | null
  substitutions: { outId: string; inId: string; team: 'A' | 'B'; at: number }[]
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
