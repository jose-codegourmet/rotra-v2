// The wire types of the bucket 1 rules. The data shapes are generated from the Go structs in
// apps/api/internal/rules/model by `make tygo` (apps/api/tygo.yaml, checked by `make tygo-check`), into
// ./generated; this file re-exports them under the names `@rotra/data` uses and adds what Go has no
// struct for. Nothing here imports `@rotra/data` (it will import this package, not the reverse).
//
// How Go's `Opt[T]` maps. Go keeps three states apart: absent (key left out), null, and a value.
// tygo cannot express that, so the Go field carries a `tstype:"T | null"` tag (null or a value) and the
// key is made optional here with `Absent` (absent). Result: `key?: T | null`. A plain Go pointer `*T`
// is `T | null` with the key always present. The Opt keys are marked "Opt keys" below.
import type {
  Court as GoCourt,
  Match as GoMatch,
  Player as GoPlayer,
  Session as GoSession,
  Substitution as GoSubstitution,
} from './generated/model'

/** Makes the listed keys optional (absent allowed) and leaves their `T | null` value type alone. */
type Absent<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] }

export type PlayingLevel = string
export type MatchFormat = GoMatch['format']
export type MatchOrigin = GoMatch['origin']
export type MatchState = GoMatch['state']
export type Team = GoSubstitution['team']
export type SubstitutionCredit = NonNullable<GoSubstitution['creditTo']>

/** Opt keys: creditTo. */
export type Substitution = Absent<GoSubstitution, 'creditTo'>

/** Opt keys: placedAt. */
export type Match = Absent<Omit<GoMatch, 'substitutions'>, 'placedAt'> & {
  substitutions: Substitution[]
}

export type MatchLineup = Pick<Match, 'format' | 'teamA' | 'teamB'>

export type MatchStatus = {
  kind: 'ready' | 'needs-attention' | 'blocked' | 'waiting-for-courts'
  reason: string
}

/** Opt keys: hasPlayedAtClubBefore, selfCheckedInAt, leftAt, gamesAdjustment. */
export type SessionPlayer = Absent<
  GoPlayer,
  'hasPlayedAtClubBefore' | 'selfCheckedInAt' | 'leftAt' | 'gamesAdjustment'
>

/** `startsAt` and `openedEarlyAt` are `omitempty` pointers in Go: absent or a time. */
export type SessionCourt = Absent<GoCourt, 'startsAt' | 'openedEarlyAt'>

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
export type SessionSettings = GoSession
export type FillOptions = {
  exceptMatchId?: string
  onlyCourtIds?: string[]
  exceptCourtIds?: string[]
}

/** The request every call carries; generated from the Go `Envelope`. */
export type { Envelope } from './generated/wire'

/** The reply every call crosses the boundary in. Go has one flat `Reply` struct (src/generated/wire.ts);
 *  this is its two real shapes, which is what `engine.ts` narrows on. */
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
