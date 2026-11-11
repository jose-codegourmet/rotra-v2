import { getConnectivity } from '../connectivity/connectivity'
import {
  CLUB_PATHS,
  DeviceStorageError,
  downloadRecordOf,
  sessionIdOfPath,
} from '../device/deviceCopy'
import {
  deviceDownloadRecords,
  ensureDeviceIndexLoaded,
  resolveAccountId,
  saveDownloadRecord,
} from '../device/deviceIndex'
import { MockError } from '../mock/errors'
import { mergeImported, parsePlayHistory, serializePlayHistory } from './outbox.rules'
import { NOT_PLAY_HISTORY, OFFLINE_SAVE_FAILED, type PlayHistoryFile } from './outbox.types'
import { readAccountBodies, readOutbox, writeImported } from './outboxStore'
import { replayOutbox } from './replay'
import { refreshOutbox } from './state'

/**
 * The play-history file (#722, D-2026-11-11-04): `playhistory.json` = the downloaded session(s),
 * their copy and the outbox, for moving a session to another device or recovering one that broke.
 * Export and import work offline. Importing is not a database sync: the file's commands join this
 * device's outbox and replay like its own; a session this device does not hold takes the file's copy.
 */

const NOTHING_TO_EXPORT = 'Nothing is downloaded on this device.'

/** The file's content for the signed-in account's downloads. */
export async function buildPlayHistory(): Promise<PlayHistoryFile> {
  const accountId = await resolveAccountId()
  if (!accountId) throw new MockError('permission', 'Sign in to export the play history.')
  const records = await deviceDownloadRecords()
  if (!records.length) throw new MockError('permission', NOTHING_TO_EXPORT)
  const [bodies, outbox] = await Promise.all([readAccountBodies(accountId), readOutbox(accountId)])
  const byPath = new Map(bodies.map((b) => [b.path, b.body]))
  return {
    format: 'rotra-play-history',
    version: 1,
    exportedAt: new Date().toISOString(),
    clubCopy: CLUB_PATHS.filter((path) => byPath.has(path)).map((path) => ({
      path,
      body: byPath.get(path),
    })),
    sessions: records.map((record) => ({
      session: downloadRecordOf(record),
      deviceCopy: bodies.filter((b) => sessionIdOfPath(b.path) === record.sessionId),
      outbox: outbox
        .filter((c) => c.sessionId === record.sessionId)
        .map(({ key: _key, accountId: _account, seq: _seq, ...command }) => command),
    })),
  }
}

export async function exportPlayHistory() {
  return { text: serializePlayHistory(await buildPlayHistory()), message: 'Play history exported' }
}

/**
 * Loads a file onto this device. Returns how many changes now wait to sync on this device (the
 * toast's count); a file that is not a ROTRA play history is refused with its documented copy.
 */
export async function importPlayHistory(
  text: string,
): Promise<{ waiting: number; message: string }> {
  const file = parsePlayHistory(text)
  if (!file) throw new MockError('permission', NOT_PLAY_HISTORY)
  const accountId = await resolveAccountId()
  if (!accountId) throw new MockError('permission', 'Sign in to import a play history.')
  await ensureDeviceIndexLoaded()
  const existing = await readOutbox(accountId)
  const held = new Set((await deviceDownloadRecords()).map((r) => r.sessionId))
  const commands = mergeImported(
    existing,
    file.sessions.flatMap((s) => s.outbox),
    accountId,
  )
  const copies = file.sessions
    .filter((s) => !held.has(s.session.sessionId))
    .map((s) => ({ record: downloadRecordOf(s.session), bodies: s.deviceCopy }))
  try {
    await writeImported(accountId, commands, copies, held.size ? [] : file.clubCopy)
  } catch (error) {
    if (error instanceof DeviceStorageError) throw new MockError('retryable', OFFLINE_SAVE_FAILED)
    throw error
  }
  for (const copy of copies) saveDownloadRecord(accountId, copy.record)
  const all = await refreshOutbox()
  if (getConnectivity() === 'online') void replayOutbox()
  const waiting = all.length
  return {
    waiting,
    message: `Play history imported · ${waiting} change${waiting === 1 ? '' : 's'} waiting to sync`,
  }
}
