import { MockError } from '../mock/errors'
import type { SyncChange } from '../sync/sync.types'
import type { CreatedIds, OutboxCommand, PlayHistoryFile, StoredCommand } from './outbox.types'

/** Pure outbox rules, shared by the IndexedDB store, the replay and the play-history file. */

export const commandKey = (accountId: string, seq: number) =>
  `${accountId}|${String(seq).padStart(16, '0')}`
export const aliasKey = (accountId: string, localId: string) => `${accountId}|${localId}`

/** Replay order: by sequence, which follows the time each command was recorded or imported. */
export const orderCommands = <T extends { seq: number }>(commands: readonly T[]) =>
  [...commands].sort((a, b) => a.seq - b.seq)

/** The next sequence number: after everything stored, and never behind the clock. */
export const nextSeq = (stored: readonly { seq: number }[], now = Date.now()) =>
  Math.max(now, ...stored.map((c) => c.seq + 1))

/**
 * Imported commands join the outbox once each: a command this device already holds (same
 * `operationId`) is skipped, the rest keep their recorded order after what is already here.
 */
export function mergeImported(
  existing: readonly StoredCommand[],
  imported: readonly OutboxCommand[],
  accountId: string,
  now = Date.now(),
): StoredCommand[] {
  const known = new Set(existing.map((c) => c.operationId))
  let seq = nextSeq(existing, now)
  const out: StoredCommand[] = []
  for (const command of [...imported].sort((a, b) => a.recordedAt - b.recordedAt)) {
    if (known.has(command.operationId)) continue
    known.add(command.operationId)
    out.push({ ...command, accountId, seq, key: commandKey(accountId, seq) })
    seq++
  }
  return out
}

/**
 * Rewrites every string in the command's arguments that names a local id to the server's id, so
 * a command recorded against a match or player this device created replays against the saved row.
 */
export function aliasArgs<T>(args: T, aliases: ReadonlyMap<string, string>): T {
  if (!aliases.size) return args
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return aliases.get(value) ?? value
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    return value
  }
  return walk(args) as T
}

/**
 * Learns server ids by walking the local outcome and the server's reply side by side: wherever
 * the local value is an id the local apply created and the server has a string at the same place,
 * that pair is an alias. Shapes that differ are skipped, never guessed.
 */
export function learnAliases(
  localData: unknown,
  serverData: unknown,
  created: CreatedIds,
): Map<string, string> {
  const ids = new Set<string>([
    ...created.matches,
    ...created.courts,
    ...created.clubPlayers,
    ...created.roster.map((r) => r.id),
    ...created.waitlist.map((w) => w.id),
  ])
  const out = new Map<string, string>()
  const walk = (local: unknown, server: unknown) => {
    if (typeof local === 'string') {
      if (ids.has(local) && typeof server === 'string' && server !== local) out.set(local, server)
      return
    }
    if (Array.isArray(local)) {
      if (!Array.isArray(server)) return
      for (const [i, item] of local.entries()) walk(item, server[i])
      return
    }
    if (local && typeof local === 'object' && server && typeof server === 'object')
      for (const [k, v] of Object.entries(local)) walk(v, (server as Record<string, unknown>)[k])
  }
  walk(localData, serverData)
  return out
}

/** Which ids were created by a local apply: present after, absent before. */
export function createdIdsOf(
  before: {
    matches: { id: string }[]
    courts: { id: string }[]
    clubPlayers: { id: string }[]
    roster: { id: string; clubPlayerId: string }[]
    waitlist: { id: string; clubPlayerId: string }[]
  },
  after: typeof before,
): CreatedIds {
  const fresh = <T extends { id: string }>(prev: T[], next: T[]) => {
    const seen = new Set(prev.map((x) => x.id))
    return next.filter((x) => !seen.has(x.id))
  }
  return {
    matches: fresh(before.matches, after.matches).map((m) => m.id),
    courts: fresh(before.courts, after.courts).map((c) => c.id),
    clubPlayers: fresh(before.clubPlayers, after.clubPlayers).map((p) => p.id),
    roster: fresh(before.roster, after.roster).map((r) => ({
      id: r.id,
      clubPlayerId: r.clubPlayerId,
    })),
    waitlist: fresh(before.waitlist, after.waitlist).map((w) => ({
      id: w.id,
      clubPlayerId: w.clubPlayerId,
    })),
  }
}

export type ReplayFailure = 'offline' | 'conflict' | 'attention'

/**
 * What a refused replay means: offline (nothing to report, it resumes on reconnect), a server
 * disagreement (409 → Q-CONFLICT), or anything else (the command stays and sync needs attention).
 */
export function replayFailureOf(error: unknown): ReplayFailure {
  if (error instanceof MockError) {
    if (error.kind === 'offline') return 'offline'
    if (error.kind === 'conflict') return 'conflict'
  }
  return 'attention'
}

/** Q-SYNC's Waiting to sync entries for the outbox, newest first like the mock log. */
export const pendingChangesOf = (commands: readonly OutboxCommand[]): SyncChange[] =>
  [...commands]
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .map((c) => ({
      id: c.operationId,
      at: c.recordedAt,
      text: c.text,
      area: c.area,
      syncedAt: null,
    }))

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

/** A command as the file carries it; anything else is not a play history. */
function isCommand(v: unknown): v is OutboxCommand {
  return (
    isRecord(v) &&
    typeof v.operationId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.recordedAt === 'number' &&
    typeof v.sessionId === 'string' &&
    typeof v.text === 'string' &&
    typeof v.area === 'string' &&
    isRecord(v.created)
  )
}

/** Parses `playhistory.json`; null for anything that is not a ROTRA play history. */
export function parsePlayHistory(text: string): PlayHistoryFile | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(value) || value.format !== 'rotra-play-history' || value.version !== 1) return null
  if (!Array.isArray(value.sessions) || !Array.isArray(value.clubCopy)) return null
  for (const entry of value.sessions) {
    if (!isRecord(entry) || !isRecord(entry.session) || !Array.isArray(entry.deviceCopy))
      return null
    if (typeof entry.session.sessionId !== 'string' || !Array.isArray(entry.session.paths))
      return null
    if (!Array.isArray(entry.outbox) || !entry.outbox.every(isCommand)) return null
  }
  return value as PlayHistoryFile
}

export const serializePlayHistory = (file: PlayHistoryFile) => JSON.stringify(file, null, 2)

/** The toast after a successful import, with everything now waiting on this device. */
export const importedToast = (waiting: number) =>
  `Play history imported · ${waiting} change${waiting === 1 ? '' : 's'} waiting to sync`
