import { MockError } from '../mock/errors'

/**
 * The read-only device copy for real mode (#477, Q11 partial). Raw IndexedDB, no dependency:
 * database `rotra-queue-device` with two object stores:
 *   - `bodies`: successful GET bodies, keyed `${accountId}|${path}`;
 *   - `downloads`: one record per downloaded session, keyed `${accountId}|${sessionId}`.
 * Downloaded sessions stay viewable offline; nothing here is an outbox and nothing written offline
 * is kept (writes still refuse offline in `real/client.ts`). Without `indexedDB` (server render,
 * tests) there is no storage: reads answer empty and a requested save fails honestly.
 */

export const DEVICE_DB_NAME = 'rotra-queue-device'
const DB_VERSION = 1
const BODIES = 'bodies'
const DOWNLOADS = 'downloads'

/** Scope of the one signed-in session body (`/api/auth/session`), read before any account is known. */
export const DEVICE_SCOPE = 'device'
export const AUTH_SESSION_PATH = '/api/auth/session'

/** Club-level reads every downloaded session needs; cached only while a download exists. */
export const CLUB_PATHS: readonly string[] = [
  AUTH_SESSION_PATH,
  '/api/sessions',
  '/api/club',
  '/api/club/players',
  '/api/license',
]

/** GET reads under `/api/sessions/{id}` that the console, queue, roster, payments, preparation and results screens make. */
export const SESSION_READ_SUFFIXES: readonly string[] = [
  '',
  '/matches',
  '/roster',
  '/cost',
  '/payments',
  '/results',
  '/sync',
]

export type DownloadRecord = {
  sessionId: string
  title: string
  startsAt: number
  downloadedAt: number
  paths: string[]
}

type StoredBody = { key: string; body: unknown }
type StoredDownload = DownloadRecord & { key: string; accountId: string }

export class DeviceStorageError extends MockError {
  constructor(message: string) {
    super('retryable', message)
  }
}

export const READ_FAILED = "Couldn't read this device's downloads."
export const SAVE_FAILED = "Couldn't save the copy on this device."

// ---------- Pure helpers ----------

export const bodyKey = (accountId: string, path: string) => `${accountId}|${path}`
export const downloadKey = (accountId: string, sessionId: string) => `${accountId}|${sessionId}`

export const sessionPathOf = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}`

/** Every path a session download fetches and keeps, in the order it is written. */
export const sessionReadPaths = (sessionId: string) =>
  SESSION_READ_SUFFIXES.map((suffix) => `${sessionPathOf(sessionId)}${suffix}`)

/** The session id a GET path belongs to, or null for `/api/sessions` itself and other paths. */
export function sessionIdOfPath(path: string): string | null {
  const match = /^\/api\/sessions\/([^/?#]+)(?:[/?#].*)?$/.exec(path)
  if (!match) return null
  try {
    return decodeURIComponent(match[1] ?? '')
  } catch {
    return null
  }
}

/**
 * Whether a GET body is kept on this device: reads of a downloaded session, plus the club-level reads
 * while at least one session is downloaded for this account.
 */
export function isCacheablePath(path: string, downloadedSessionIds: ReadonlySet<string>) {
  const sessionId = sessionIdOfPath(path)
  if (sessionId !== null) return downloadedSessionIds.has(sessionId)
  return downloadedSessionIds.size > 0 && CLUB_PATHS.includes(path)
}

export function downloadRecordOf(input: {
  sessionId: string
  title: string
  startsAt: number
  downloadedAt: number
  paths: readonly string[]
}): DownloadRecord {
  return {
    sessionId: input.sessionId,
    title: input.title,
    startsAt: input.startsAt,
    downloadedAt: input.downloadedAt,
    paths: [...input.paths],
  }
}

/** The Downloads / This device list: soonest session first. */
export function deviceDownloadsOf(records: readonly DownloadRecord[]) {
  return [...records]
    .sort((a, b) => a.startsAt - b.startsAt)
    .map((record) => ({
      sessionId: record.sessionId,
      title: record.title,
      startsAt: record.startsAt,
      state: 'ready' as const,
    }))
}

// ---------- IndexedDB wrappers ----------

export const hasDeviceStorage = () => typeof indexedDB !== 'undefined'

const prefixRange = (prefix: string) => IDBKeyRange.bound(prefix, `${prefix}￿`)

const requestOf = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DEVICE_DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(BODIES)) db.createObjectStore(BODIES, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(DOWNLOADS))
        db.createObjectStore(DOWNLOADS, { keyPath: 'key' })
    }
    request.onsuccess = () => {
      const db = request.result
      // Another tab upgrading or the user clearing site data: reopen on the next call.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      db.onclose = () => {
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('blocked'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

async function withStores<T>(
  mode: IDBTransactionMode,
  failure: string,
  run: (bodies: IDBObjectStore, downloads: IDBObjectStore) => Promise<T>,
): Promise<T> {
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    throw new DeviceStorageError(failure)
  }
  try {
    const tx = db.transaction([BODIES, DOWNLOADS], mode)
    const result = await run(tx.objectStore(BODIES), tx.objectStore(DOWNLOADS))
    await done(tx)
    return result
  } catch (error) {
    if (error instanceof DeviceStorageError) throw error
    throw new DeviceStorageError(failure)
  }
}

/** Every download record on this device, all accounts; empty without storage. */
export async function readAllDownloadRecords(): Promise<StoredDownload[]> {
  if (!hasDeviceStorage()) return []
  return withStores('readonly', READ_FAILED, (_bodies, downloads) =>
    requestOf(downloads.getAll() as IDBRequest<StoredDownload[]>),
  )
}

/** A cached GET body; `found: false` when the path was never kept (or there is no storage). */
export async function readCachedBody(
  accountId: string,
  path: string,
): Promise<{ found: boolean; body: unknown }> {
  if (!hasDeviceStorage()) return { found: false, body: undefined }
  return withStores('readonly', READ_FAILED, async (bodies) => {
    const stored = await requestOf(bodies.get(bodyKey(accountId, path)) as IDBRequest<StoredBody>)
    return stored ? { found: true, body: stored.body } : { found: false, body: undefined }
  })
}

export async function writeCachedBody(accountId: string, path: string, body: unknown) {
  if (!hasDeviceStorage()) throw new DeviceStorageError(SAVE_FAILED)
  await withStores('readwrite', SAVE_FAILED, async (bodies) => {
    bodies.put({ key: bodyKey(accountId, path), body } satisfies StoredBody)
  })
}

export async function deleteCachedBody(accountId: string, path: string) {
  if (!hasDeviceStorage()) return
  await withStores('readwrite', SAVE_FAILED, async (bodies) => {
    bodies.delete(bodyKey(accountId, path))
  })
}

/**
 * One session's copy, written whole in a single transaction: the record and every body it lists.
 * A failure leaves the previous copy (if any) exactly as it was.
 */
export async function writeDownload(
  accountId: string,
  record: DownloadRecord,
  bodies: readonly { path: string; body: unknown }[],
) {
  if (!hasDeviceStorage()) throw new DeviceStorageError(SAVE_FAILED)
  await withStores('readwrite', SAVE_FAILED, async (bodyStore, downloads) => {
    for (const { path, body } of bodies)
      bodyStore.put({ key: bodyKey(accountId, path), body } satisfies StoredBody)
    downloads.put({
      ...record,
      key: downloadKey(accountId, record.sessionId),
      accountId,
    } satisfies StoredDownload)
  })
}

/** Removes a session's record and the bodies only it listed. */
export async function deleteDownload(accountId: string, sessionId: string) {
  if (!hasDeviceStorage()) return
  await withStores('readwrite', SAVE_FAILED, async (bodies, downloads) => {
    const key = downloadKey(accountId, sessionId)
    const record = await requestOf(downloads.get(key) as IDBRequest<StoredDownload | undefined>)
    if (!record) return
    for (const path of record.paths)
      if (sessionIdOfPath(path) === sessionId) bodies.delete(bodyKey(accountId, path))
    downloads.delete(key)
  })
}

/** Everything kept for one account, plus the signed-in session body. */
export async function clearAccount(accountId: string | null) {
  if (!hasDeviceStorage()) return
  await withStores('readwrite', SAVE_FAILED, async (bodies, downloads) => {
    bodies.delete(bodyKey(DEVICE_SCOPE, AUTH_SESSION_PATH))
    if (accountId === null) return
    bodies.delete(prefixRange(`${accountId}|`))
    downloads.delete(prefixRange(`${accountId}|`))
  })
}
