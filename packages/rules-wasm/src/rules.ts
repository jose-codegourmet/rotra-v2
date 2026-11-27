// Today's bucket 1 rule names and signatures (packages/data match.rules, courtFill, queueSession.rules,
// sessionRoster.rules), run by the Go rules in WebAssembly. Synchronous once `loadRules()` (Node) or
// `loadRulesInBrowser()` has resolved; before that every call throws `RulesError`.
// Differences from the TypeScript originals, all forced by the JSON boundary:
//   - `now` comes from `ctx.now` (or the argument) and defaults to `Date.now()` here, never in Go.
//   - `creditedPlayers` still returns a `Map`.
//   - `putOnCourt` returns the placed copy instead of changing `match` in place.
//   - `FORMAT_TEAM_SIZES` is the function `formatTeamSizes()`.
import { engine } from './engine'
import type {
  CourtFillMode,
  EndCourts,
  FillOptions,
  Gender,
  Match,
  MatchCategory,
  MatchContext,
  MatchLineup,
  MatchStatus,
  Placement,
  PlayerForm,
  ResultCheck,
  ResultInput,
  SessionCourt,
  SessionPlayer,
  SessionSettings,
  Standing,
  SwapTarget,
  Team,
  WinChance,
  WinChanceBreakdown,
  WinChancePlayer,
} from './types'

type Ctx = Pick<MatchContext, 'roster' | 'matches' | 'courts'>
type Roster = Pick<MatchContext, 'roster' | 'matches'>

const world = (ctx: Ctx) => ({ roster: ctx.roster, matches: ctx.matches, courts: ctx.courts })
const clock = (ctx: { now?: number }) => ctx.now ?? Date.now()
const run = <T>(rule: string, input: unknown, now?: number) => engine().call(rule, input, now) as T

// match: guards
export const canPlace = (match: Match, courtIds: string[], ctx: MatchContext) =>
  run<boolean>('match/canPlace', { match, courtIds, ...world(ctx) }, clock(ctx))
export const canStart = (match: Match, courtIds: string[], ctx: MatchContext) =>
  run<boolean>('match/canStart', { match, courtIds, ...world(ctx) }, clock(ctx))
export const canSendBack = (match: Pick<Match, 'state'>) =>
  run<boolean>('match/canSendBack', { match })
export const canMoveCourt = (match: Match, courtIds: string[], ctx: MatchContext) =>
  run<boolean>('match/canMoveCourt', { match, courtIds, ...world(ctx) }, clock(ctx))
export const canMovePlaying = (match: Match, courtIds: string[], ctx: MatchContext) =>
  run<boolean>('match/canMovePlaying', { match, courtIds, ...world(ctx) }, clock(ctx))
export const canReplacePlayer = (match: Match, outId: string, inId: string, ctx: MatchContext) =>
  run<boolean>('match/canReplacePlayer', { match, outId, inId, ...world(ctx) }, ctx.now)
export const replacedLineup = (lineup: MatchLineup, outId: string, inId: string) =>
  run<MatchLineup>('match/replacedLineup', { lineup, outId, inId })
export const swapTarget = (match: Match, ctx: MatchContext) =>
  run<SwapTarget | null>('match/swapTarget', { match, ...world(ctx) }, clock(ctx))
export const validateResult = (input: ResultInput) =>
  run<ResultCheck>('match/validateResult', input)
export const matchStatus = (match: Match, ctx: MatchContext) =>
  run<MatchStatus>('match/matchStatus', { match, ...world(ctx) }, clock(ctx))
export const completeLineup = (lineup: MatchLineup) =>
  run<boolean>('match/completeLineup', { lineup })
export const substitutionCandidates = (match: Match, roster: SessionPlayer[], matches: Match[]) =>
  run<SessionPlayer[]>('match/substitutionCandidates', { match, roster, matches })
export const courtsNeeded = (match: Pick<Match, 'format'>) =>
  run<number>('match/courtsNeeded', { match })
export const holdsCourt = (match: Pick<Match, 'state'>) =>
  run<boolean>('match/holdsCourt', { match })
export const formatTeamSizes = () =>
  run<Record<string, readonly [number, number]>>('match/FORMAT_TEAM_SIZES', {})

// match: game counts, waits, standings
export const countedGames = (id: string, matches: Match[]) =>
  run<number>('match/countedGames', { id, matches })
export const countsFor = (match: Match, id: string) =>
  run<boolean>('match/countsFor', { match, id })
export const countedTeam = (match: Match, id: string) =>
  run<Team | null>('match/countedTeam', { match, id })
export const creditedPlayers = (match: Pick<Match, 'substitutions'>) =>
  new Map(run<[string, Team][]>('match/creditedPlayers', { match }))
export const substitutionSlots = (substitutions: Match['substitutions']) =>
  run<number[]>('match/substitutionSlots', { substitutions })
export const isPartial = (match: Pick<Match, 'substitutions'>, id: string) =>
  run<boolean>('match/isPartial', { match, id })
export const gamesAdjustmentOf = (player: Pick<SessionPlayer, 'gamesAdjustment'> | undefined) =>
  run<number>('match/gamesAdjustmentOf', { player })
export const gamesPlayed = (
  player: Pick<SessionPlayer, 'id' | 'gamesAdjustment'>,
  matches: Match[],
) => run<number>('match/gamesPlayed', { player, matches })
export const gamesPlayedFor = (id: string, ctx: Roster) =>
  run<number>('match/gamesPlayedFor', { id, roster: ctx.roster, matches: ctx.matches })
export const waitMinutes = (
  player: SessionPlayer,
  matches: Match[],
  startedAt: number | null,
  now: number = Date.now(),
) => run<number>('match/waitMinutes', { player, matches, startedAt }, now)
export const queuedCount = (id: string, matches: Match[]) =>
  run<number>('match/queuedCount', { id, matches })
export const computeStandings = (roster: SessionPlayer[], matches: Match[]) =>
  run<Standing[]>('match/computeStandings', { roster, matches })

// match: names and win chance
type Genders = readonly (Gender | null | undefined)[]
export const matchCategory = (teams: { teamA: Genders; teamB: Genders }) =>
  run<MatchCategory>('match/matchCategory', teams)
export const matchLabel = (
  lineup: Pick<MatchLineup, 'format' | 'teamA' | 'teamB'>,
  roster: readonly { id: string; gender?: Gender | null }[],
) => run<string>('match/matchLabel', { lineup, roster })
export const winChance = (
  match: Pick<Match, 'teamA' | 'teamB'> & Partial<Pick<Match, 'state' | 'decision'>>,
  players: readonly WinChancePlayer[],
  matches: readonly Match[],
) => run<WinChance>('match/winChance', { match, players, matches })
export const winChanceBreakdown = (
  match: Pick<Match, 'teamA' | 'teamB'> & Partial<Pick<Match, 'state' | 'decision'>>,
  players: readonly WinChancePlayer[],
  matches: readonly Match[],
) => run<WinChanceBreakdown>('match/winChanceBreakdown', { match, players, matches })
export const formRating = (
  player: WinChancePlayer,
  players: readonly WinChancePlayer[],
  matches: readonly Match[],
) => run<number>('match/formRating', { player, players, matches })
export const isUpset = (match: Match, players: readonly WinChancePlayer[]) =>
  run<boolean>('match/isUpset', { match, players })
export const formFromHistory = (
  sessions: readonly { weekday: number; wins: number; losses: number }[],
  tonightWeekday: number,
) => run<PlayerForm>('match/formFromHistory', { sessions, tonightWeekday })

// courts
export const courtOpen = (court: SessionCourt, now: number = Date.now()) =>
  run<boolean>('courts/courtOpen', { court }, now)
export const openedEarly = (court: SessionCourt, now: number = Date.now()) =>
  run<boolean>('courts/openedEarly', { court }, now)
export const freeCourts = (courts: SessionCourt[], matches: Match[], now: number = Date.now()) =>
  run<SessionCourt[]>('courts/freeCourts', { courts, matches }, now)
export const isBookingEnded = (court: SessionCourt, sessionEnd: number, now: number) =>
  run<boolean>('courts/isBookingEnded', { court, sessionEnd }, now)
export const sessionEndError = (input: {
  startedAt: number | null
  scheduledStartAt: number
  endAt: number
  courts: EndCourts
  now: number
}) => {
  const { now, ...rest } = input
  return run<string | null>('courts/sessionEndError', rest, now)
}
export const sessionEndCourtConflict = (
  courts: EndCourts,
  endAt: number,
  courtBase: number,
  now: number,
) => run<string | null>('courts/sessionEndCourtConflict', { courts, endAt, courtBase }, now)

// roster
export const inUnfinishedMatch = (
  rosterId: string,
  matches: Pick<Match, 'state' | 'teamA' | 'teamB'>[],
) => run<boolean>('roster/inUnfinishedMatch', { rosterId, matches })
export const slotCapacity = (courts: number, playersPerCourt: number) =>
  run<number>('roster/slotCapacity', { courts, playersPerCourt })
export const openSlots = (capacity: number, rosterCount: number) =>
  run<number>('roster/openSlots', { capacity, rosterCount })
/** The shapes of @rotra/schema/level-restriction, kept local so the wrapper has no schema dependency. */
export type LevelBand = 'beginner' | 'intermediate' | 'advanced'
export type LevelSlots = Record<LevelBand, number>
export type LevelRestriction = { kind: string; slots?: LevelSlots }
export const levelRestrictionBlock = (
  restriction: LevelRestriction | null,
  band: LevelBand | null,
  taken?: Partial<LevelSlots>,
) => run<string | null>('roster/levelRestrictionBlock', { restriction, band, taken })

// court fill
/** The whole court fill in ONE call (per-match `canPlace` calls cost far more across the boundary). */
export const autoFillPlacements = (ctx: MatchContext, options: FillOptions = {}) =>
  engine().autoFillPlacements(
    {
      ...world(ctx),
      exceptMatchId: options.exceptMatchId,
      onlyCourtIds: options.onlyCourtIds,
      exceptCourtIds: options.exceptCourtIds,
    },
    clock(ctx),
  ) as Placement[]
export const nextEligibleForCourt = (
  courtId: string,
  ctx: MatchContext,
  session?: SessionSettings,
) =>
  run<Match | null>(
    'courtfill/nextEligibleForCourt',
    { courtId, session, ...world(ctx) },
    clock(ctx),
  )
export const nextMatchCandidates = (courtId: string, ctx: MatchContext, limit?: number) =>
  run<Match[]>('courtfill/nextMatchCandidates', { courtId, limit, ...world(ctx) }, clock(ctx))
export const courtFillModeOf = (session: { courtFillMode?: CourtFillMode }) =>
  run<CourtFillMode>('courtfill/courtFillModeOf', { session })
export const putOnCourt = (match: Match, courtIds: string[], now: number = Date.now()) =>
  run<Match>('courtfill/putOnCourt', { match, courtIds }, now)
