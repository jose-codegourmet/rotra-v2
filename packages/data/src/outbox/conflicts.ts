import { deviceDownloadOf, removeDownload, resolveAccountId } from '../device/deviceIndex'
import { MockError } from '../mock/errors'
import type { SessionIntegrity, SyncConflict } from '../sync/sync.types'
import type { StoredCommand } from './outbox.types'
import { clearSessionOutbox, deleteCommand, updateCommand } from './outboxStore'
import { replayOutbox } from './replay'
import { conflicts, ensureOutboxLoaded, outboxCommands, pendingFor, refreshOutbox } from './state'

/**
 * Q-CONFLICT and Q-INTERRUPTION over the outbox (#722). A command the server refused with a 409 is
 * shown as a conflict the Queue Master reviews: keep the server's version (the command is dropped,
 * the ones after it replay) or retry it. The interruption answer: Yes replays this device's changes
 * (continue here); No gives the copy up (its commands are cleared and the copy is superseded) after
 * the explicit invalid-session confirmation that follows in the screen.
 */

/** A refused command as the review list shows it: what this device recorded and what the server said. */
export function conflictOf(command: StoredCommand): SyncConflict {
  return {
    id: command.operationId,
    matchNumber: 0,
    courtLabel: '',
    versions: [],
    pending: {
      text: command.text,
      area: command.area,
      recordedAt: command.recordedAt,
      message: command.conflict?.message ?? 'The server has a different record.',
    },
  }
}

/** The outbox's part of a session's integrity, or null when nothing of this session waits. */
export async function outboxIntegrityOf(sessionId: string): Promise<SessionIntegrity | null> {
  await ensureOutboxLoaded()
  const pending = pendingFor(sessionId)
  if (!pending.length) return null
  const refused = pending.filter((c) => c.conflict)
  if (refused.length)
    return {
      sessionId,
      state: 'conflicts',
      missingSummary: [],
      conflicts: refused.map(conflictOf),
    }
  const n = pending.length
  return {
    sessionId,
    state: 'records_missing',
    missingSummary: [
      {
        label: 'Changes on this device not synced',
        detail: `${n} change${n === 1 ? '' : 's'} saved on this device ${n === 1 ? 'has' : 'have'} not reached ROTRA yet.`,
      },
    ],
    conflicts: [],
  }
}

function refusedCommand(operationId: string) {
  const command = conflicts().find((c) => c.operationId === operationId)
  if (!command) throw new MockError('conflict', 'This conflict was already reviewed.')
  return command
}

/** Keep the server's version: the refused command leaves the outbox; the ones after it replay. */
export async function keepServerVersion(operationId: string) {
  const command = refusedCommand(operationId)
  await deleteCommand(command.key)
  await refreshOutbox()
  void replayOutbox()
  return { message: "Kept the server's version" }
}

/** Retry: the command is sent again as recorded (with the ids learned so far). */
export async function retryConflict(operationId: string) {
  const command = refusedCommand(operationId)
  const { conflict: _conflict, ...rest } = command
  await updateCommand(rest)
  await refreshOutbox()
  await replayOutbox()
  const still = outboxCommands().find((c) => c.operationId === operationId)
  if (still?.conflict) throw new MockError('conflict', still.conflict.message)
  return { message: 'Change synced' }
}

/** Yes, continue here: this device's changes replay now (or as soon as it is online). */
export async function continueHere() {
  await replayOutbox()
}

/** No: this copy is given up. Its commands are cleared and the copy is superseded. */
export async function giveUpLocalCopy(sessionId: string) {
  const accountId = await resolveAccountId()
  if (!accountId) return
  await clearSessionOutbox(accountId, sessionId)
  if (await deviceDownloadOf(sessionId)) await removeDownload(accountId, sessionId)
  await refreshOutbox()
}
