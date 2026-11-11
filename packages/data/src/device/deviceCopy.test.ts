import { describe, expect, it } from 'vitest'
import { MockError } from '../mock/errors'
import {
  bodyKey,
  CLUB_PATHS,
  DeviceStorageError,
  deviceDownloadsOf,
  downloadKey,
  downloadRecordOf,
  isCacheablePath,
  readAllDownloadRecords,
  readCachedBody,
  SAVE_FAILED,
  sessionIdOfPath,
  sessionReadPaths,
  writeCachedBody,
  writeDownload,
} from './deviceCopy'

const account = 'club-1'
const sessionId = '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a'

describe('Device copy › keys and paths (#477)', () => {
  it('scopes every key to the account', () => {
    expect(bodyKey(account, '/api/club')).toBe('club-1|/api/club')
    expect(downloadKey(account, sessionId)).toBe(`club-1|${sessionId}`)
  })

  it('reads the session id out of a session path, and nothing out of the list', () => {
    expect(sessionIdOfPath(`/api/sessions/${sessionId}/matches`)).toBe(sessionId)
    expect(sessionIdOfPath(`/api/sessions/${sessionId}`)).toBe(sessionId)
    expect(sessionIdOfPath(`/api/sessions/${encodeURIComponent('a b')}/roster`)).toBe('a b')
    expect(sessionIdOfPath('/api/sessions')).toBeNull()
    expect(sessionIdOfPath('/api/club/players')).toBeNull()
  })

  it('lists every read a session download keeps, the session itself first', () => {
    expect(sessionReadPaths(sessionId)).toEqual([
      `/api/sessions/${sessionId}`,
      `/api/sessions/${sessionId}/matches`,
      `/api/sessions/${sessionId}/roster`,
      `/api/sessions/${sessionId}/cost`,
      `/api/sessions/${sessionId}/payments`,
      `/api/sessions/${sessionId}/results`,
      `/api/sessions/${sessionId}/sync`,
    ])
  })

  it('caches reads of a downloaded session and club reads only while one is downloaded', () => {
    const none = new Set<string>()
    const one = new Set([sessionId])
    expect(isCacheablePath(`/api/sessions/${sessionId}/roster`, one)).toBe(true)
    expect(isCacheablePath(`/api/sessions/${sessionId}/roster`, none)).toBe(false)
    expect(isCacheablePath('/api/sessions/other-session/roster', one)).toBe(false)
    for (const path of CLUB_PATHS) {
      expect(isCacheablePath(path, one)).toBe(true)
      expect(isCacheablePath(path, none)).toBe(false)
    }
    expect(isCacheablePath('/api/venues', one)).toBe(false)
    expect(isCacheablePath('/api/sync', one)).toBe(false)
  })
})

describe('Device copy › records', () => {
  const record = downloadRecordOf({
    sessionId,
    title: 'Tuesday night',
    startsAt: 2_000,
    downloadedAt: 3_000,
    paths: [`/api/sessions/${sessionId}`],
  })

  it('shapes a download record and copies its path list', () => {
    expect(record).toEqual({
      sessionId,
      title: 'Tuesday night',
      startsAt: 2_000,
      downloadedAt: 3_000,
      paths: [`/api/sessions/${sessionId}`],
    })
  })

  it('lists downloads soonest first as ready, without the stored paths', () => {
    const later = { ...record, sessionId: 'later', startsAt: 9_000 }
    expect(deviceDownloadsOf([later, record])).toEqual([
      { sessionId, title: 'Tuesday night', startsAt: 2_000, state: 'ready' },
      { sessionId: 'later', title: 'Tuesday night', startsAt: 9_000, state: 'ready' },
    ])
  })
})

describe('Device copy › without IndexedDB (server render, tests)', () => {
  it('reads as empty storage, never as a failure', async () => {
    expect(typeof indexedDB).toBe('undefined')
    await expect(readAllDownloadRecords()).resolves.toEqual([])
    await expect(readCachedBody(account, '/api/club')).resolves.toEqual({
      found: false,
      body: undefined,
    })
  })

  it('refuses a requested save honestly', async () => {
    const saves = [
      writeCachedBody(account, '/api/club', {}),
      writeDownload(
        account,
        downloadRecordOf({ sessionId, title: 't', startsAt: 0, downloadedAt: 0, paths: [] }),
        [],
      ),
    ]
    for (const save of saves) {
      const error = await save.catch((e: unknown) => e)
      expect(error).toBeInstanceOf(DeviceStorageError)
      expect(error).toBeInstanceOf(MockError)
      expect(error).toMatchObject({ kind: 'retryable', message: SAVE_FAILED })
    }
  })
})
