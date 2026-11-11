import {
  bodyKey,
  DeviceStorageError,
  type DownloadRecord,
  downloadKey,
  hasDeviceStorage,
  prefixRange,
  requestOf,
  type StoredBody,
  withDeviceStores,
} from '../device/deviceCopy'
import { aliasKey, commandKey, nextSeq, orderCommands } from './outbox.rules'
import {
  OFFLINE_SAVE_FAILED,
  type OutboxCommand,
  type StoredAlias,
  type StoredCommand,
} from './outbox.types'

/**
 * The outbox and alias stores of the device database (`device/deviceCopy.ts`). An offline save
 * writes the changed GET bodies and the command in one transaction, so the screens never show a
 * change that is not in the outbox and vice versa. Without storage every write refuses honestly.
 */

const READ_FAILED = "Couldn't read the changes waiting on this device."

export async function readOutbox(accountId: string): Promise<StoredCommand[]> {
  if (!hasDeviceStorage()) return []
  const stored = await withDeviceStores('readonly', READ_FAILED, ({ outbox }) =>
    requestOf(outbox.getAll(prefixRange(`${accountId}|`)) as IDBRequest<StoredCommand[]>),
  )
  return orderCommands(stored)
}

/**
 * One offline change: the bodies the screens read, written over, and the command appended to the
 * outbox, together or not at all.
 */
export async function writeOfflineChange(
  accountId: string,
  bodies: readonly { path: string; body: unknown }[],
  command: OutboxCommand,
): Promise<StoredCommand> {
  if (!hasDeviceStorage()) throw new DeviceStorageError(OFFLINE_SAVE_FAILED)
  return withDeviceStores('readwrite', OFFLINE_SAVE_FAILED, async ({ bodies: store, outbox }) => {
    const existing = await requestOf(
      outbox.getAll(prefixRange(`${accountId}|`)) as IDBRequest<StoredCommand[]>,
    )
    const seq = nextSeq(existing)
    const stored: StoredCommand = { ...command, accountId, seq, key: commandKey(accountId, seq) }
    for (const { path, body } of bodies)
      store.put({ key: bodyKey(accountId, path), body } satisfies StoredBody)
    outbox.put(stored)
    return stored
  })
}

/** Appends imported commands (already sequenced by `mergeImported`) and, for new sessions, their copy. */
export async function writeImported(
  accountId: string,
  commands: readonly StoredCommand[],
  copies: readonly { record: DownloadRecord; bodies: readonly { path: string; body: unknown }[] }[],
  clubBodies: readonly { path: string; body: unknown }[],
) {
  if (!hasDeviceStorage()) throw new DeviceStorageError(OFFLINE_SAVE_FAILED)
  await withDeviceStores(
    'readwrite',
    OFFLINE_SAVE_FAILED,
    async ({ bodies: store, downloads, outbox }) => {
      for (const { record, bodies } of copies) {
        for (const { path, body } of bodies)
          store.put({ key: bodyKey(accountId, path), body } satisfies StoredBody)
        downloads.put({ ...record, key: downloadKey(accountId, record.sessionId), accountId })
      }
      for (const { path, body } of clubBodies)
        store.put({ key: bodyKey(accountId, path), body } satisfies StoredBody)
      for (const command of commands) outbox.put(command)
    },
  )
}

export async function updateCommand(command: StoredCommand) {
  if (!hasDeviceStorage()) throw new DeviceStorageError(OFFLINE_SAVE_FAILED)
  await withDeviceStores('readwrite', OFFLINE_SAVE_FAILED, async ({ outbox }) => {
    outbox.put(command)
  })
}

export async function deleteCommand(key: string) {
  if (!hasDeviceStorage()) return
  await withDeviceStores('readwrite', OFFLINE_SAVE_FAILED, async ({ outbox }) => {
    outbox.delete(key)
  })
}

/** Drops every command of one session (the unrecoverable answer, after explicit confirmation). */
export async function clearSessionOutbox(accountId: string, sessionId: string) {
  if (!hasDeviceStorage()) return
  await withDeviceStores('readwrite', OFFLINE_SAVE_FAILED, async ({ outbox }) => {
    const stored = await requestOf(
      outbox.getAll(prefixRange(`${accountId}|`)) as IDBRequest<StoredCommand[]>,
    )
    for (const command of stored) if (command.sessionId === sessionId) outbox.delete(command.key)
  })
}

export async function readAliases(accountId: string): Promise<Map<string, string>> {
  if (!hasDeviceStorage()) return new Map()
  const stored = await withDeviceStores('readonly', READ_FAILED, ({ aliases }) =>
    requestOf(aliases.getAll(prefixRange(`${accountId}|`)) as IDBRequest<StoredAlias[]>),
  )
  return new Map(stored.map((a) => [a.localId, a.serverId]))
}

/** Persists learned aliases and removes the replayed command in one transaction. */
export async function commitReplay(
  accountId: string,
  commandKey: string,
  learned: ReadonlyMap<string, string>,
) {
  if (!hasDeviceStorage()) return
  await withDeviceStores('readwrite', OFFLINE_SAVE_FAILED, async ({ outbox, aliases }) => {
    for (const [localId, serverId] of learned)
      aliases.put({
        key: aliasKey(accountId, localId),
        accountId,
        localId,
        serverId,
      } satisfies StoredAlias)
    outbox.delete(commandKey)
  })
}

/** Every body kept for the account: the play-history export reads the copy from here. */
export async function readAccountBodies(
  accountId: string,
): Promise<{ path: string; body: unknown }[]> {
  if (!hasDeviceStorage()) return []
  const prefix = `${accountId}|`
  const stored = await withDeviceStores('readonly', READ_FAILED, ({ bodies }) =>
    requestOf(bodies.getAll(prefixRange(prefix)) as IDBRequest<StoredBody[]>),
  )
  return stored.map((b) => ({ path: b.key.slice(prefix.length), body: b.body }))
}
