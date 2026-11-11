import { getConnectivity } from '../connectivity/connectivity'
import {
  AUTH_SESSION_PATH,
  CLUB_PATHS,
  DEVICE_SCOPE,
  DeviceStorageError,
  deviceDownloadsOf,
  downloadRecordOf,
  sessionPathOf,
  sessionReadPaths,
  writeCachedBody,
} from '../device/deviceCopy'
import {
  clearDeviceCopy,
  deviceDownloadRecords,
  isDownloading,
  markDownloading,
  noteDownloadError,
  removeDownload,
  resolveAccountId,
  saveDownload,
  setCurrentAccountId,
} from '../device/deviceIndex'
import { MockError } from '../mock/errors'
import { msOf, RealRequestError, realRequest } from './client'

/**
 * Real-mode session download (#477): a read-only copy of one prepared or active session on this
 * device. Online only; every GET the session screens make is fetched now and written in one
 * transaction, so a failure keeps the previous copy whole. There is no outbox: nothing done offline
 * is kept or replayed, and no screen may say "Saved on this device".
 */

type WireSessionHead = {
  session: { id: string; title: string; state: string; scheduledStartAt: string }
}

/** A GET that may not exist for this session (results before finalization) is skipped, not failed. */
async function fetchOrSkip(path: string) {
  try {
    return { path, body: await realRequest<unknown>(path), found: true }
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404)
      return { path, body: undefined, found: false }
    throw error
  }
}

export async function realDownloadSession(sessionId: string) {
  if (getConnectivity() === 'offline')
    throw new MockError('offline', "You're offline. Reconnect and try again.")
  if (isDownloading(sessionId))
    throw new MockError('conflict', 'This session is already downloading.')
  const head = await realRequest<WireSessionHead>(sessionPathOf(sessionId))
  if (!['prepared', 'active'].includes(head.session.state))
    throw new MockError('permission', 'Session not available.')
  const accountId = await resolveAccountId()
  if (!accountId) throw new MockError('permission', 'Sign in again to download this session.')
  const previous = (await deviceDownloadRecords()).find((r) => r.sessionId === sessionId)
  markDownloading(sessionId, true)
  try {
    const fetched = await Promise.all(
      [...sessionReadPaths(sessionId), ...CLUB_PATHS].map(fetchOrSkip),
    )
    const kept = fetched.filter((entry) => entry.found)
    const session = kept.find((entry) => entry.path === AUTH_SESSION_PATH)
    const bodies = kept
      .filter((entry) => entry.path !== AUTH_SESSION_PATH)
      .map(({ path, body }) => ({ path, body }))
    const record = downloadRecordOf({
      sessionId,
      title: head.session.title,
      startsAt: msOf(head.session.scheduledStartAt),
      downloadedAt: Date.now(),
      paths: bodies.map((entry) => entry.path),
    })
    await saveDownload(accountId, record, bodies)
    // The signed-in session body is scoped to the device so it can be read before any account is known.
    if (session) await writeCachedBody(DEVICE_SCOPE, AUTH_SESSION_PATH, session.body)
    return { message: 'Ready on this device' }
  } catch (error) {
    const failure =
      error instanceof DeviceStorageError
        ? error
        : new MockError(
            'retryable',
            previous
              ? 'Download failed. Your previous copy is kept.'
              : 'Download failed. Try again when connected.',
          )
    noteDownloadError(sessionId, failure.message)
    throw failure
  } finally {
    markDownloading(sessionId, false)
  }
}

/** Sessions downloaded on this device for the signed-in account; empty storage is an empty list. */
export async function realGetDeviceDownloads() {
  try {
    return deviceDownloadsOf(await deviceDownloadRecords())
  } catch (error) {
    if (error instanceof DeviceStorageError) throw error
    throw new DeviceStorageError("Couldn't read this device's downloads.")
  }
}

/** Removes one session's copy from this device (no screen offers it yet). */
export async function removeDeviceDownload(sessionId: string) {
  const accountId = await resolveAccountId()
  if (!accountId) return
  await removeDownload(accountId, sessionId)
}

/** After a real sign-out succeeded: the account's copy leaves the device. */
export async function clearDeviceCopyOnSignOut() {
  const accountId = await resolveAccountId()
  try {
    await clearDeviceCopy(accountId)
  } catch (error) {
    console.warn('[rotra] device copy not cleared on sign-out', error)
  } finally {
    setCurrentAccountId(null)
  }
}
