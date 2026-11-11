import { getConnectivity } from '../connectivity/connectivity'
import { DeviceStorageError, readCachedBody } from '../device/deviceCopy'
import { deviceDownloadOf, deviceDownloadRecords, resolveAccountId } from '../device/deviceIndex'
import { MockError } from '../mock/errors'
import { withWorkingState } from '../mock/store'
import type { WireMatch } from '../real/match'
import { isRealDataMode } from '../real/mode'
import { saveToastText } from '../sync/fetchers'
import type { SaveOutcome } from '../sync/sync.types'
import { COMMANDS, type CommandName } from './commands'
import { createdIdsOf } from './outbox.rules'
import { OFFLINE_SAVE_FAILED, type OutboxCommand } from './outbox.types'
import { writeOfflineChange } from './outboxStore'
import { ensureOutboxLoaded, hasPending, refreshOutbox } from './state'
import {
  type Bodies,
  buildWorkingState,
  changedBodiesOf,
  sessionPaths,
  workingStatePaths,
} from './workingState'

/**
 * One door for every Queue Master write (#722, D-2026-11-11-04):
 *   - mock mode: the mock path (`local`), as before;
 *   - real mode, online, nothing waiting for the session: the real adapter, as before;
 *   - real mode, offline (or online while earlier changes of the session still wait, so order is
 *     kept) on a downloaded session: `local` runs over the downloaded copy as a working state, the
 *     bodies the screens read are rewritten and the command joins the outbox, in one transaction.
 * Offline without a downloaded copy refuses exactly as `realRequest` does.
 */

const OFFLINE_REFUSAL = "You're offline. This needs an internet connection."
const SUFFIX = ' · Saved on this device, waiting to sync'

/** Offline applies run one at a time: the working state is a single shared override. */
let chain: Promise<unknown> = Promise.resolve()
let inside = false
function serialized<T>(run: () => Promise<T>): Promise<T> {
  // A write started from inside another's reducer (a batch flushed late) cannot be its own
  // command, and waiting for the chain here would wait forever: refuse it instead, retryable.
  if (inside)
    return Promise.reject(new MockError('retryable', 'Another change is saving. Try again.'))
  const next = chain.then(
    async () => {
      inside = true
      try {
        return await run()
      } finally {
        inside = false
      }
    },
    async () => {
      inside = true
      try {
        return await run()
      } finally {
        inside = false
      }
    },
  )
  chain = next.catch(() => undefined)
  return next
}

/** The downloaded session whose matches include this match, for commands that only name a match. */
async function sessionOfMatch(accountId: string, matchId: string): Promise<string | null> {
  for (const record of await deviceDownloadRecords().catch(() => [])) {
    const kept = await readCachedBody(accountId, sessionPaths(record.sessionId).matches).catch(
      () => ({ found: false, body: undefined }),
    )
    const body = kept.body as { matches?: WireMatch[] } | undefined
    if (kept.found && body?.matches?.some((m) => m.id === matchId)) return record.sessionId
  }
  return null
}

async function copyBodies(accountId: string, sessionId: string): Promise<Bodies> {
  const bodies = new Map<string, unknown>()
  for (const path of workingStatePaths(sessionId)) {
    const kept = await readCachedBody(accountId, path)
    if (kept.found) bodies.set(path, kept.body)
  }
  return bodies
}

const idsOf = (s: {
  matches: { id: string }[]
  courts: { id: string }[]
  clubPlayers: { id: string }[]
  roster: { id: string; clubPlayerId: string }[]
  waitlist: { id: string; clubPlayerId: string }[]
}) => ({
  matches: s.matches.map((m) => ({ id: m.id })),
  courts: s.courts.map((c) => ({ id: c.id })),
  clubPlayers: s.clubPlayers.map((p) => ({ id: p.id })),
  roster: s.roster.map((r) => ({ id: r.id, clubPlayerId: r.clubPlayerId })),
  waitlist: s.waitlist.map((w) => ({ id: w.id, clubPlayerId: w.clubPlayerId })),
})

async function applyLocally<R extends SaveOutcome & { data: unknown }>(
  name: CommandName,
  args: unknown,
  sessionId: string,
  local: () => Promise<R>,
): Promise<R> {
  return serialized(async () => {
    const accountId = await resolveAccountId()
    if (!accountId) throw new MockError('offline', OFFLINE_REFUSAL)
    const bodies = await copyBodies(accountId, sessionId)
    const working = buildWorkingState(bodies, sessionId)
    if (!working) throw new MockError('offline', OFFLINE_REFUSAL)
    const before = idsOf(working.state)
    const { result, state } = await withWorkingState(working.state, local)
    const after = { state, clubId: working.clubId }
    const text = result.message.endsWith(SUFFIX)
      ? result.message.slice(0, -SUFFIX.length)
      : result.message
    const given = (args as { operationId?: unknown } | null)?.operationId
    const command: OutboxCommand = {
      operationId: typeof given === 'string' && given.trim() ? given : crypto.randomUUID(),
      name,
      args,
      recordedAt: Date.now(),
      sessionId,
      text,
      area: COMMAND_AREAS[name],
      localData: result.data,
      created: createdIdsOf(before, idsOf(state)),
    }
    try {
      await writeOfflineChange(accountId, changedBodiesOf(bodies, after, sessionId), command)
    } catch (error) {
      if (error instanceof DeviceStorageError) throw new MockError('retryable', OFFLINE_SAVE_FAILED)
      throw error
    }
    await refreshOutbox()
    return { ...result, savedOffline: true, message: saveToastText(text, { savedOffline: true }) }
  })
}

/** Q-SYNC groups by the part of the session a change touched. */
const COMMAND_AREAS: Record<CommandName, OutboxCommand['area']> = {
  'roster.batch': 'Roster',
  'roster.addSaved': 'Roster',
  'roster.addNew': 'Roster',
  'roster.presence': 'Roster',
  'roster.presenceMany': 'Roster',
  'roster.presenceAll': 'Roster',
  'roster.stepDown': 'Roster',
  'roster.gamesPlayed': 'Roster',
  'roster.giveSlot': 'Roster',
  'roster.fillOpenSlots': 'Roster',
  'roster.removeFromWaitlist': 'Roster',
  'queue.add': 'Queue',
  'queue.make': 'Queue',
  'queue.lineup': 'Queue',
  'queue.suggested': 'Queue',
  'queue.auto': 'Queue',
  'queue.regenerate': 'Queue',
  'queue.move': 'Queue',
  'queue.remove': 'Queue',
  'queue.swapPlayers': 'Queue',
  'match.place': 'Matches and results',
  'match.start': 'Matches and results',
  'match.sendBack': 'Queue',
  'match.moveCourt': 'Matches and results',
  'match.replace': 'Matches and results',
  'match.swapWithQueue': 'Queue',
  'match.complete': 'Matches and results',
  'match.invalidate': 'Matches and results',
  'match.substitute': 'Matches and results',
  'courts.add': 'Courts and time',
  'courts.update': 'Courts and time',
  'courts.openEarly': 'Courts and time',
  'courts.openAllEarly': 'Courts and time',
  'courts.undoEarly': 'Courts and time',
  'courts.remove': 'Courts and time',
  'session.end': 'Courts and time',
  'session.extend': 'Courts and time',
  'payments.marks': 'Payments',
  'payments.amount': 'Payments',
  'payments.toggle': 'Payments',
  'payments.markAll': 'Payments',
}

export async function dispatch<R extends SaveOutcome & { data: unknown }>(
  name: CommandName,
  args: unknown,
  local: () => Promise<R>,
): Promise<R> {
  if (!isRealDataMode()) return local()
  const definition = COMMANDS[name]
  const offline = getConnectivity() === 'offline'
  await ensureOutboxLoaded()
  const accountId = await resolveAccountId()
  const sessionId =
    definition.sessionIdOf(args) ??
    (accountId ? await sessionOfMatch(accountId, (args as { matchId: string }).matchId) : null)
  const queued = sessionId !== null && hasPending(sessionId)
  if (!offline && !queued) return definition.remote(args, crypto.randomUUID()) as Promise<R>
  const downloaded = sessionId !== null && (await deviceDownloadOf(sessionId)) !== null
  if (!downloaded) {
    if (offline) throw new MockError('offline', OFFLINE_REFUSAL)
    return definition.remote(args, crypto.randomUUID()) as Promise<R>
  }
  return applyLocally(name, args, sessionId as string, local)
}
