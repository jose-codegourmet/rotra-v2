import {
  realMarkAllPaid,
  realSetPaymentAmount,
  realSetPaymentMarks,
  realTogglePaid,
} from '../real/financials'
import {
  realAddMatch,
  realAddSuggestedMatch,
  realAutoQueue,
  realCompleteMatch,
  realInvalidateMatch,
  realMakeMatch,
  realMoveCourt,
  realMoveMatch,
  realPlaceOnCourt,
  realRegenerateQueue,
  realRemoveWaitingMatch,
  realReplacePlayer,
  realSendBackToQueue,
  realStartMatch,
  realSubstitutePlayer,
  realSwapPlayers,
  realSwapWithQueue,
  realUpdateMatchLineup,
} from '../real/match'
import { realAddNewPlayerToSession, realAddSavedPlayerToSession } from '../real/queue'
import {
  realAddCourt,
  realApplyRosterBatch,
  realExtendSession,
  realFillOpenSlots,
  realGiveSlot,
  realOpenAllCourtsEarly,
  realOpenCourtEarly,
  realRemoveCourt,
  realRemoveFromWaitlist,
  realSetAllPresence,
  realSetGamesPlayed,
  realSetPresence,
  realSetPresenceMany,
  realSetSessionEnd,
  realStepDownToWaitlist,
  realUndoCourtEarlyOpen,
  realUpdateCourt,
} from '../real/session-live'
import type { SaveOutcome } from '../sync/sync.types'

/**
 * The command registry (#722): every Queue Master write the offline rules allow, by name, with the
 * real adapter that replays it. The mutation modules dispatch through these names
 * (`outbox/dispatch.ts`); the replay looks the adapter up here, so a command recorded before a
 * reload still finds its way to the server. Writes the rules keep online (setup, Start, Delete,
 * Session done, Publish, Manual | Auto Queue, global search) are not listed and refuse offline.
 */

type Outcome = SaveOutcome & { data: unknown }

export type CommandDefinition = {
  /** Sends the command online; `operationId` is the command's own, so a repeat never saves twice. */
  remote: (args: unknown, operationId: string) => Promise<Outcome>
  /** The session the command belongs to, or null when only the match id is known. */
  sessionIdOf: (args: unknown) => string | null
}

type WithSession = { sessionId: string; operationId?: string }
type Remote<A> = (args: A) => Promise<Outcome>

/** An object input that names its session; the command's operation id rides along. */
const bySession = <A extends WithSession>(remote: Remote<A>): CommandDefinition => ({
  remote: (args, operationId) =>
    remote({ ...(args as A), operationId: (args as A).operationId ?? operationId }),
  sessionIdOf: (args) => (args as A).sessionId,
})

/** A match command: the input carries the match id (and its own operation id from the screen). */
const byMatch = <A extends { matchId: string; operationId: string }>(
  remote: Remote<A>,
): CommandDefinition => ({
  remote: (args) => remote(args as A),
  sessionIdOf: () => null,
})

/** A command whose whole input is the session id. */
const bySessionId = (remote: (sessionId: string, operationId: string) => Promise<Outcome>) =>
  ({
    remote: (args, operationId) => remote(args as string, operationId),
    sessionIdOf: (args) => args as string,
  }) satisfies CommandDefinition

export const COMMANDS = {
  'roster.batch': bySession(realApplyRosterBatch),
  'roster.addSaved': bySession(realAddSavedPlayerToSession),
  'roster.addNew': bySession(realAddNewPlayerToSession),
  'roster.presence': bySession(realSetPresence),
  'roster.presenceMany': bySession(realSetPresenceMany),
  'roster.presenceAll': bySession(realSetAllPresence),
  'roster.stepDown': bySession(realStepDownToWaitlist),
  'roster.gamesPlayed': bySession(realSetGamesPlayed),
  'roster.giveSlot': bySession(realGiveSlot),
  'roster.fillOpenSlots': bySessionId(realFillOpenSlots),
  'roster.removeFromWaitlist': bySession(realRemoveFromWaitlist),
  'queue.add': bySession(realAddMatch),
  'queue.make': bySession(realMakeMatch),
  'queue.lineup': bySession(realUpdateMatchLineup),
  'queue.suggested': bySession(realAddSuggestedMatch),
  'queue.auto': bySession(realAutoQueue),
  'queue.regenerate': bySessionId(realRegenerateQueue),
  'queue.move': bySession(realMoveMatch),
  'queue.remove': bySession(realRemoveWaitingMatch),
  'queue.swapPlayers': bySession(realSwapPlayers),
  'match.place': byMatch(realPlaceOnCourt),
  'match.start': byMatch(realStartMatch),
  'match.sendBack': byMatch(realSendBackToQueue),
  'match.moveCourt': byMatch(realMoveCourt),
  'match.replace': byMatch(realReplacePlayer),
  'match.swapWithQueue': byMatch(realSwapWithQueue),
  'match.complete': byMatch(realCompleteMatch),
  'match.invalidate': byMatch(realInvalidateMatch),
  'match.substitute': byMatch(realSubstitutePlayer),
  'courts.add': bySession(realAddCourt),
  'courts.update': bySession(realUpdateCourt),
  'courts.openEarly': bySession(realOpenCourtEarly),
  'courts.openAllEarly': bySession(realOpenAllCourtsEarly),
  'courts.undoEarly': bySession(realUndoCourtEarlyOpen),
  'courts.remove': bySession(realRemoveCourt),
  'session.end': bySession(realSetSessionEnd),
  'session.extend': bySession(realExtendSession),
  'payments.marks': bySession(realSetPaymentMarks),
  'payments.amount': bySession(realSetPaymentAmount),
  'payments.toggle': bySession(realTogglePaid),
  'payments.markAll': bySessionId(realMarkAllPaid),
} satisfies Record<string, CommandDefinition>

export type CommandName = keyof typeof COMMANDS

export const isCommandName = (name: string): name is CommandName => name in COMMANDS
