/**
 * The app's own pure rules, imported straight from the workspace (no `@rotra/data` dependency and
 * no new export subpath): real mode generates Auto queue drafts on the client with
 * `generateAutoQueueMatches` and checks them with `autoQueueDraftConflict` before it POSTs them,
 * so the simulation does exactly the same. The minimum is never computed here.
 */
export {
  autoQueueDraftConflict,
  generateAutoQueueMatches,
} from '../../../../packages/data/src/match/autoQueue.rules.ts'
export type {
  AutoQueueMode,
  BaggingSettings,
} from '../../../../packages/data/src/match/autoQueue.types.ts'
export type { MatchContext } from '../../../../packages/data/src/match/match.rules.ts'
export {
  activeMatchFor,
  allPlayers,
  canReplacePlayer,
  courtOpen,
  matchStatus,
  shortOnPlayers,
  substitutionCandidates,
} from '../../../../packages/data/src/match/match.rules.ts'
export type {
  Match,
  MatchLineup,
  SubstitutionCredit,
} from '../../../../packages/data/src/match/match.types.ts'
export type { PlayingLevel } from '../../../../packages/data/src/player/player.types.ts'
export type {
  QueueSession,
  SessionCourt,
} from '../../../../packages/data/src/queue-session/queueSession.types.ts'
export type { SessionPlayer } from '../../../../packages/data/src/session-roster/sessionRoster.types.ts'
