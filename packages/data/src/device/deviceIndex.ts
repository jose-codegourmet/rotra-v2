import type { MockSession } from '../auth/auth.types'
import {
  AUTH_SESSION_PATH,
  clearAccount,
  DEVICE_SCOPE,
  DeviceStorageError,
  type DownloadRecord,
  deleteCachedBody,
  deleteDownload,
  downloadKey,
  isCacheablePath,
  READ_FAILED,
  readAllDownloadRecords,
  readCachedBody,
  writeCachedBody,
  writeDownload,
} from './deviceCopy'

/**
 * In-memory index over the device copy, loaded once per tab from IndexedDB so `realRequest` can tell
 * cheaply whether a GET belongs to a downloaded session. The storage stays the truth: every change
 * goes to IndexedDB first and updates this index only after it was written.
 */

const records = new Map<string, DownloadRecord>() // downloadKey → record
const downloading = new Set<string>() // sessionId, this tab, this account
const downloadErrors = new Map<string, string>() // sessionId → last failure in this tab

/** The signed-in club account as last seen by `/api/auth/session` or sign-in in this tab. */
let currentAccountId: string | null = null
let loading: Promise<void> | null = null
let loadFailed = false
let storeFailureLogged = false

/** Loads the index once; an unreadable storage is remembered (`loadFailed`) and retried next time. */
export function ensureDeviceIndexLoaded() {
  if (!loading)
    loading = readAllDownloadRecords()
      .then((stored) => {
        for (const record of stored) records.set(record.key, record)
        loadFailed = false
      })
      .catch(() => {
        loadFailed = true
        loading = null
      })
  return loading
}

export function setCurrentAccountId(accountId: string | null) {
  currentAccountId = accountId
}

const accountOf = (body: unknown) => (body as MockSession | null | undefined)?.account?.id ?? null

/** The account in memory, else the one whose session body this device kept. */
export async function resolveAccountId(): Promise<string | null> {
  if (currentAccountId) return currentAccountId
  const { found, body } = await readCachedBody(DEVICE_SCOPE, AUTH_SESSION_PATH).catch(() => ({
    found: false,
    body: undefined,
  }))
  if (found) currentAccountId = accountOf(body)
  return currentAccountId
}

function downloadedIdsOf(accountId: string) {
  const ids = new Set<string>()
  const prefix = `${accountId}|`
  for (const [key, record] of records) if (key.startsWith(prefix)) ids.add(record.sessionId)
  return ids
}

/** The record for the current account's download of a session, or null (also when storage is unreadable). */
export async function deviceDownloadOf(sessionId: string): Promise<DownloadRecord | null> {
  await ensureDeviceIndexLoaded()
  const accountId = await resolveAccountId()
  if (!accountId) return null
  return records.get(downloadKey(accountId, sessionId)) ?? null
}

/** This account's download records. Unreadable storage is a `DeviceStorageError`, never an empty list. */
export async function deviceDownloadRecords(): Promise<DownloadRecord[]> {
  await ensureDeviceIndexLoaded()
  if (loadFailed) throw new DeviceStorageError(READ_FAILED)
  const accountId = await resolveAccountId()
  if (!accountId) return []
  const prefix = `${accountId}|`
  return [...records.entries()].filter(([key]) => key.startsWith(prefix)).map(([, r]) => r)
}

export const isDownloading = (sessionId: string) => downloading.has(sessionId)
export const downloadErrorOf = (sessionId: string) => downloadErrors.get(sessionId)
export function markDownloading(sessionId: string, on: boolean) {
  if (on) {
    downloading.add(sessionId)
    downloadErrors.delete(sessionId)
  } else downloading.delete(sessionId)
}
export const noteDownloadError = (sessionId: string, message: string) =>
  downloadErrors.set(sessionId, message)

/** Writes a whole session copy, then indexes it. Throws `DeviceStorageError` when nothing was saved. */
export async function saveDownload(
  accountId: string,
  record: DownloadRecord,
  bodies: readonly { path: string; body: unknown }[],
) {
  await writeDownload(accountId, record, bodies)
  records.set(downloadKey(accountId, record.sessionId), record)
}

export async function removeDownload(accountId: string, sessionId: string) {
  await deleteDownload(accountId, sessionId)
  records.delete(downloadKey(accountId, sessionId))
}

/** Sign-out: this account's copy and the signed-in session body leave the device. */
export async function clearDeviceCopy(accountId: string | null) {
  await clearAccount(accountId)
  if (accountId) {
    const prefix = `${accountId}|`
    for (const key of [...records.keys()]) if (key.startsWith(prefix)) records.delete(key)
  }
  currentAccountId = null
}

/**
 * After a successful online GET: keep the body when it belongs to the device copy. Fire-and-forget;
 * a storage failure is logged once and never turns the live answer into a failure.
 */
export function rememberGetBody(path: string, body: unknown) {
  void (async () => {
    try {
      await ensureDeviceIndexLoaded()
      if (path === AUTH_SESSION_PATH) {
        const accountId = accountOf(body)
        currentAccountId = accountId
        // The kept session body always names the account whose downloads are on this device.
        if (accountId && downloadedIdsOf(accountId).size > 0)
          await writeCachedBody(DEVICE_SCOPE, AUTH_SESSION_PATH, body)
        else await deleteCachedBody(DEVICE_SCOPE, AUTH_SESSION_PATH)
        return
      }
      const accountId = await resolveAccountId()
      if (!accountId || !isCacheablePath(path, downloadedIdsOf(accountId))) return
      await writeCachedBody(accountId, path, body)
    } catch (error) {
      if (storeFailureLogged) return
      storeFailureLogged = true
      console.warn('[rotra] device copy not updated', error)
    }
  })()
}

/** Offline: the kept body for a GET, or `found: false` so the caller refuses as before. */
export async function readOfflineBody(path: string): Promise<{ found: boolean; body: unknown }> {
  try {
    await ensureDeviceIndexLoaded()
    if (path === AUTH_SESSION_PATH) {
      const kept = await readCachedBody(DEVICE_SCOPE, AUTH_SESSION_PATH)
      if (kept.found) currentAccountId = accountOf(kept.body)
      return kept
    }
    const accountId = await resolveAccountId()
    if (!accountId || !isCacheablePath(path, downloadedIdsOf(accountId)))
      return { found: false, body: undefined }
    return await readCachedBody(accountId, path)
  } catch {
    return { found: false, body: undefined }
  }
}
