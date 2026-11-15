// Hand-written wire types for the bucket 1 rules, matching what `@rotra/data` uses today.
// TODO(rule-cases 5.5, B-23): replace this file with types generated from the Go structs by `tygo`
// and checked in CI. Nothing here imports `@rotra/data` (it will import this package, not the reverse).
export type PlayingLevel = string
export type MatchFormat = 'singles' | 'doubles' | 'fun_1v2' | 'fun_3v3' | 'fun_4v4' | 'fun_5v5'
export type MatchOrigin = 'manual' | 'suggested' | 'auto'
export type MatchState = 'waiting' | 'on_court' | 'active' | 'completed' | 'invalid'
export type SubstitutionCredit = 'none' | 'incoming' | 'outgoing'
export type Team = 'A' | 'B'

export type Substitution = {
  outId: string
  inId: string
  team: Team
  at: number
  creditTo?: SubstitutionCredit
}

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
  placedAt?: number | null
  startedAt: number | null
  endedAt: number | null
  substitutions: Substitution[]
  decision: {
    kind: 'completed' | 'invalid'
    winningTeam: Team | null
    teamAScore: number | null
    teamBScore: number | null
    confirmedAt: number
  } | null
}

export type MatchLineup = Pick<Match, 'format' | 'teamA' | 'teamB'>

export type MatchStatus = {
  kind: 'ready' | 'needs-attention' | 'blocked' | 'waiting-for-courts'
  reason: string
}

export type SessionPlayer = {
  id: string
  sessionId: string
  clubPlayerId: string
  nameSnapshot: string
  nicknameSnapshot: string | null
  present: boolean
  presentChangedAt: number | null
  level: PlayingLevel | null
  levelLockedAt: number | null
  confirmedAt: number
  hasPlayedAtClubBefore?: boolean
  selfCheckedInAt?: number | null
  leftAt?: number | null
  gamesAdjustment?: number
}

export type SessionCourt = {
  id: string
  sessionId: string
  label: string
  startsAt?: number
  openedEarlyAt?: number | null
  openUntil: number | null
  removedAt: number | null
}

export type CourtFillMode = 'manual' | 'auto'

/** The world a rule reads. `now` is epoch milliseconds; a rule that reads the clock gets it from here. */
export type MatchContext = {
  roster: SessionPlayer[]
  matches: Match[]
  courts: SessionCourt[]
  now?: number
}

export type ResultInput = {
  format: MatchFormat
  kind: 'completed' | 'invalid'
  winningTeam: Team | null
  teamAScore: number | null
  teamBScore: number | null
}

export type SwapTarget = Record<string, unknown> & { id?: string }
export type Placement = { matchId: string; courtIds: string[] }
export type Standing = Record<string, unknown>
export type EndCourts = Pick<SessionCourt, 'label' | 'startsAt' | 'openUntil' | 'removedAt'>[]
export type SessionSettings = { allowSingles: boolean; allowDoubles: boolean }
export type FillOptions = {
  exceptMatchId?: string
  onlyCourtIds?: string[]
  exceptCourtIds?: string[]
}

/** The reply shape every call crosses the boundary in. */
export type Reply = { ok: true; result: unknown } | { ok: false; error: string }

/** What `rules-manifest.json` holds (written by build.mjs). */
export type RulesManifest = {
  wasm: string
  sha256: string
  bytes: number
  versions: number[]
  goVersion: string
  wasmExec: { file: string; sha256: string }
}
