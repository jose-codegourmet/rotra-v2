// Test support: the rule name -> wrapper call mapping, the same inputs as
// packages/data/src/rule-cases/runners.ts but calling the WebAssembly wrapper instead of TypeScript.
import {
  autoFillPlacements,
  canMoveCourt,
  canPlace,
  canReplacePlayer,
  canSendBack,
  canStart,
  completeLineup,
  computeStandings,
  countedGames,
  countedTeam,
  countsFor,
  courtFillModeOf,
  courtOpen,
  courtsNeeded,
  creditedPlayers,
  formatTeamSizes,
  formFromHistory,
  formRating,
  freeCourts,
  gamesAdjustmentOf,
  gamesPlayed,
  gamesPlayedFor,
  holdsCourt,
  inUnfinishedMatch,
  isBookingEnded,
  isPartial,
  isUpset,
  matchCategory,
  matchLabel,
  matchStatus,
  nextEligibleForCourt,
  nextMatchCandidates,
  openedEarly,
  openSlots,
  putOnCourt,
  queuedCount,
  replacedLineup,
  sessionEndCourtConflict,
  sessionEndError,
  slotCapacity,
  substitutionCandidates,
  substitutionSlots,
  swapTarget,
  validateResult,
  waitMinutes,
  winChance,
  winChanceBreakdown,
} from '../src/rules'
import type {
  CourtFillMode,
  EndCourts,
  Match,
  MatchContext,
  MatchLineup,
  ResultInput,
  SessionCourt,
  SessionPlayer,
  SessionSettings,
  WinChancePlayer,
} from '../src/types'

type Runner = (input: unknown, now?: number) => unknown
type World = { roster: SessionPlayer[]; matches: Match[]; courts: SessionCourt[] }
type Session = SessionSettings
type WinInput = { match: Match; players: WinChancePlayer[]; matches: Match[] }

const rule = <I>(fn: (input: I, now?: number) => unknown): Runner => {
  return (input, now) => fn(input as I, now)
}
const ctxOf = (w: World, now?: number): MatchContext => ({
  roster: w.roster,
  matches: w.matches,
  courts: w.courts,
  ...(now === undefined ? {} : { now }),
})

export const WRAPPER_RUNNERS: Record<string, Runner> = {
  'match/canPlace': rule<World & { match: Match; courtIds: string[] }>((i, now) =>
    canPlace(i.match, i.courtIds, ctxOf(i, now)),
  ),
  'match/canStart': rule<World & { match: Match; courtIds: string[] }>((i, now) =>
    canStart(i.match, i.courtIds, ctxOf(i, now)),
  ),
  'match/canSendBack': rule<{ match: Pick<Match, 'state'> }>((i) => canSendBack(i.match)),
  'match/canMoveCourt': rule<World & { match: Match; courtIds: string[] }>((i, now) =>
    canMoveCourt(i.match, i.courtIds, ctxOf(i, now)),
  ),
  'match/canReplacePlayer': rule<World & { match: Match; outId: string; inId: string }>((i, now) =>
    canReplacePlayer(i.match, i.outId, i.inId, ctxOf(i, now)),
  ),
  'match/replacedLineup': rule<{ lineup: MatchLineup; outId: string; inId: string }>((i) =>
    replacedLineup(i.lineup, i.outId, i.inId),
  ),
  'match/swapTarget': rule<World & { match: Match }>((i, now) =>
    swapTarget(i.match, ctxOf(i, now)),
  ),
  'match/validateResult': rule<ResultInput>((i) => validateResult(i)),
  'match/matchStatus': rule<World & { match: Match }>((i, now) =>
    matchStatus(i.match, ctxOf(i, now)),
  ),
  'match/completeLineup': rule<{ lineup: MatchLineup }>((i) => completeLineup(i.lineup)),
  'match/substitutionCandidates': rule<World & { match: Match }>((i) =>
    substitutionCandidates(i.match, i.roster, i.matches),
  ),
  'match/courtsNeeded': rule<{ match: Pick<Match, 'format'> }>((i) => courtsNeeded(i.match)),
  'match/holdsCourt': rule<{ match: Pick<Match, 'state'> }>((i) => holdsCourt(i.match)),
  'match/FORMAT_TEAM_SIZES': rule<Record<string, never>>(() => formatTeamSizes()),
  'match/countedGames': rule<{ id: string; matches: Match[] }>((i) =>
    countedGames(i.id, i.matches),
  ),
  'match/countsFor': rule<{ match: Match; id: string }>((i) => countsFor(i.match, i.id)),
  'match/countedTeam': rule<{ match: Match; id: string }>((i) => countedTeam(i.match, i.id)),
  'match/creditedPlayers': rule<{ match: Pick<Match, 'substitutions'> }>((i) => [
    ...creditedPlayers(i.match).entries(),
  ]),
  'match/substitutionSlots': rule<{ substitutions: Match['substitutions'] }>((i) =>
    substitutionSlots(i.substitutions),
  ),
  'match/isPartial': rule<{ match: Pick<Match, 'substitutions'>; id: string }>((i) =>
    isPartial(i.match, i.id),
  ),
  'match/gamesAdjustmentOf': rule<{ player?: Pick<SessionPlayer, 'gamesAdjustment'> }>((i) =>
    gamesAdjustmentOf(i.player),
  ),
  'match/gamesPlayed': rule<{
    player: Pick<SessionPlayer, 'id' | 'gamesAdjustment'>
    matches: Match[]
  }>((i) => gamesPlayed(i.player, i.matches)),
  'match/gamesPlayedFor': rule<{ id: string; roster: SessionPlayer[]; matches: Match[] }>((i) =>
    gamesPlayedFor(i.id, i),
  ),
  'match/waitMinutes': rule<{ player: SessionPlayer; matches: Match[]; startedAt: number | null }>(
    (i, now) => waitMinutes(i.player, i.matches, i.startedAt, now),
  ),
  'match/queuedCount': rule<{ id: string; matches: Match[] }>((i) => queuedCount(i.id, i.matches)),
  'match/matchCategory': rule<Parameters<typeof matchCategory>[0]>((i) => matchCategory(i)),
  'match/matchLabel': rule<{
    lineup: Parameters<typeof matchLabel>[0]
    roster: Parameters<typeof matchLabel>[1]
  }>((i) => matchLabel(i.lineup, i.roster)),
  'match/winChance': rule<WinInput>((i) => winChance(i.match, i.players, i.matches)),
  'match/winChanceBreakdown': rule<WinInput>((i) =>
    winChanceBreakdown(i.match, i.players, i.matches),
  ),
  'match/formRating': rule<{
    player: WinChancePlayer
    players: WinChancePlayer[]
    matches: Match[]
  }>((i) => formRating(i.player, i.players, i.matches)),
  'match/isUpset': rule<{ match: Match; players: WinChancePlayer[] }>((i) =>
    isUpset(i.match, i.players),
  ),
  'match/formFromHistory': rule<{
    sessions: Parameters<typeof formFromHistory>[0]
    tonightWeekday: number
  }>((i) => formFromHistory(i.sessions, i.tonightWeekday)),
  'match/computeStandings': rule<{ roster: SessionPlayer[]; matches: Match[] }>((i) =>
    computeStandings(i.roster, i.matches),
  ),

  'courts/courtOpen': rule<{ court: SessionCourt }>((i, now) => courtOpen(i.court, now)),
  'courts/openedEarly': rule<{ court: SessionCourt }>((i, now) => openedEarly(i.court, now)),
  'courts/freeCourts': rule<{ courts: SessionCourt[]; matches: Match[] }>((i, now) =>
    freeCourts(i.courts, i.matches, now),
  ),
  'courts/isBookingEnded': rule<{ court: SessionCourt; sessionEnd: number }>((i, now) =>
    isBookingEnded(i.court, i.sessionEnd, now as number),
  ),
  'courts/sessionEndError': rule<{
    startedAt: number | null
    scheduledStartAt: number
    endAt: number
    courts: EndCourts
  }>((i, now) => sessionEndError({ ...i, now: now as number })),
  'courts/sessionEndCourtConflict': rule<{
    courts: EndCourts
    endAt: number
    courtBase: number
  }>((i, now) => sessionEndCourtConflict(i.courts, i.endAt, i.courtBase, now as number)),

  'roster/inUnfinishedMatch': rule<{
    rosterId: string
    matches: Pick<Match, 'state' | 'teamA' | 'teamB'>[]
  }>((i) => inUnfinishedMatch(i.rosterId, i.matches)),
  'roster/slotCapacity': rule<{ courts: number; playersPerCourt: number }>((i) =>
    slotCapacity(i.courts, i.playersPerCourt),
  ),
  'roster/openSlots': rule<{ capacity: number; rosterCount: number }>((i) =>
    openSlots(i.capacity, i.rosterCount),
  ),

  'courtfill/autoFillPlacements': rule<
    World & { exceptMatchId?: string; onlyCourtIds?: string[]; exceptCourtIds?: string[] }
  >((i, now) =>
    autoFillPlacements(ctxOf(i, now), {
      exceptMatchId: i.exceptMatchId,
      onlyCourtIds: i.onlyCourtIds,
      exceptCourtIds: i.exceptCourtIds,
    }),
  ),
  'courtfill/nextEligibleForCourt': rule<World & { courtId: string; session?: Session }>((i, now) =>
    nextEligibleForCourt(i.courtId, ctxOf(i, now), i.session),
  ),
  'courtfill/nextMatchCandidates': rule<World & { courtId: string; limit?: number }>((i, now) =>
    nextMatchCandidates(i.courtId, ctxOf(i, now), i.limit),
  ),
  'courtfill/courtFillModeOf': rule<{ session: { courtFillMode?: CourtFillMode } }>((i) =>
    courtFillModeOf(i.session),
  ),
  'courtfill/putOnCourt': rule<{ match: Match; courtIds: string[] }>((i, now) =>
    putOnCourt(i.match, i.courtIds, now),
  ),
}

/** Rules that read the clock: every case for one carries `now`. */
export const CLOCK_RULES: ReadonlySet<string> = new Set([
  'match/waitMinutes',
  'match/matchStatus',
  'match/canPlace',
  'match/canStart',
  'match/canMoveCourt',
  'match/swapTarget',
  'courtfill/autoFillPlacements',
  'courtfill/nextEligibleForCourt',
  'courtfill/nextMatchCandidates',
  'courts/courtOpen',
  'courts/openedEarly',
  'courts/freeCourts',
  'courts/isBookingEnded',
  'courts/sessionEndError',
  'courts/sessionEndCourtConflict',
  'courtfill/putOnCourt',
])
