import { getConnectivity } from '../connectivity/connectivity'
import { deviceDownloadOf, resolveAccountId } from '../device/deviceIndex'
import { realDownloadSession } from '../real/device'
import { readQueue } from '../real/match'
import { realGetSessionRoster } from '../real/queue'
import { COMMANDS, isCommandName } from './commands'
import { aliasArgs, learnAliases, replayFailureOf } from './outbox.rules'
import type { StoredCommand } from './outbox.types'
import { commitReplay, readAliases, updateCommand } from './outboxStore'
import {
  isReplaying,
  noteSynced,
  outboxCommands,
  refreshOutbox,
  setProblem,
  setReplaying,
} from './state'

/**
 * Replays the outbox in order through the real adapters once the internet is back (#722). Every
 * command sends its own operation id, so a lost reply and a retry never save twice. The server's
 * ids for rows this device created are learned from each reply (or a roster re-read) and rewritten
 * into the commands that follow. The first failure stops the run: a 409 marks the command for
 * Q-CONFLICT, anything else keeps it and asks for attention. A session whose commands all landed
 * gets its copy downloaded again, so the device shows what the server saved.
 */

const finished = new Set<() => void>()
/** Called after a replay that drained at least one command (the screens refetch). */
export function onReplayFinished(listener: () => void) {
  finished.add(listener)
  return () => {
    finished.delete(listener)
  }
}

/** Roster and waitlist ids are not in the add replies: the saved roster names them by club player. */
async function learnRosterIds(
  command: StoredCommand,
  aliases: Map<string, string>,
): Promise<Map<string, string>> {
  const learned = new Map<string, string>()
  if (!command.created.roster.length && !command.created.waitlist.length) return learned
  const read = await realGetSessionRoster(command.sessionId)
  const serverIdOf = (clubPlayerId: string) => aliases.get(clubPlayerId) ?? clubPlayerId
  for (const row of command.created.roster) {
    const saved = read.roster.find((r) => r.clubPlayerId === serverIdOf(row.clubPlayerId))
    if (saved && saved.id !== row.id) learned.set(row.id, saved.id)
  }
  for (const row of command.created.waitlist) {
    const saved = read.waitlist.find((w) => w.clubPlayerId === serverIdOf(row.clubPlayerId))
    if (saved && saved.id !== row.id) learned.set(row.id, saved.id)
  }
  return learned
}

let queued = false

/** Runs the replay; a call while one runs queues exactly one more run after it. */
export async function replayOutbox(): Promise<void> {
  if (isReplaying()) {
    queued = true
    return
  }
  if (getConnectivity() === 'offline') return
  const accountId = await resolveAccountId()
  if (!accountId) return
  setReplaying(true)
  let drained = 0
  const touched = new Set<string>()
  try {
    const commands = await refreshOutbox()
    const aliases = await readAliases(accountId)
    for (const command of commands) {
      if (getConnectivity() === 'offline') break
      if (command.conflict) {
        // Waits for Q-CONFLICT's review; nothing after it may jump ahead.
        break
      }
      if (!isCommandName(command.name)) {
        setProblem('retry')
        break
      }
      try {
        // A fresh read of the queue: revisions the adapters send are then the server's current ones,
        // and the matches this device created are known by their saved ids.
        await readQueue(command.sessionId)
        const args = aliasArgs(command.args, aliases)
        const outcome = await COMMANDS[command.name].remote(args, command.operationId)
        const learned = new Map([
          ...learnAliases(command.localData, outcome.data, command.created),
          ...(await learnRosterIds(command, aliases)),
        ])
        for (const [k, v] of learned) aliases.set(k, v)
        await commitReplay(accountId, command.key, learned)
        noteSynced({
          id: command.operationId,
          at: command.recordedAt,
          text: command.text,
          area: command.area,
          syncedAt: Date.now(),
        })
        drained++
        touched.add(command.sessionId)
      } catch (error) {
        const failure = replayFailureOf(error)
        if (failure === 'conflict') {
          const message =
            error instanceof Error ? error.message : 'The server has a different record.'
          await updateCommand({ ...command, conflict: { message, at: Date.now() } }).catch(() => {})
        }
        if (failure !== 'offline') setProblem('retry')
        break
      }
    }
    if (drained && !outboxCommands().some((c) => c.conflict)) setProblem(undefined)
    await refreshOutbox()
    // The copy of a session that has nothing left waiting follows the server again.
    for (const sessionId of touched)
      if (
        !outboxCommands().some((c) => c.sessionId === sessionId) &&
        (await deviceDownloadOf(sessionId)) &&
        getConnectivity() === 'online'
      )
        await realDownloadSession(sessionId).catch(() => undefined)
  } finally {
    setReplaying(false)
  }
  if (drained) for (const listener of finished) listener()
  if (queued) {
    queued = false
    await replayOutbox()
  }
}
