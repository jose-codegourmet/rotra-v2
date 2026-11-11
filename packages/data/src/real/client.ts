import { getConnectivity } from '../connectivity/connectivity'
import { sessionIdOfPath } from '../device/deviceCopy'
import { readOfflineBody, rememberGetBody } from '../device/deviceIndex'
import { MockError, type MockErrorKind } from '../mock/errors'
import { pathHasPendingWork } from '../outbox/state'

/** A refused Route Handler call; `status` lets a read tell not-found from other failures. */
export class RealRequestError extends MockError {
  constructor(
    kind: MockErrorKind,
    message: string,
    readonly status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(kind, message, fieldErrors)
  }
}

type ErrorBody = { error?: { code?: string; message?: string; fields?: Record<string, string> } }

const KIND_BY_STATUS: Record<number, MockErrorKind> = {
  401: 'permission',
  403: 'permission',
  404: 'permission',
  409: 'conflict',
  422: 'permission',
}

/**
 * One call to the app's own Route Handlers. Failures become the same `MockError` kinds the screens
 * already handle; a write whose reply never arrives is a 'timeout' (it may have been saved), never
 * a success. `fields` maps service field keys to the form's field names.
 *
 * Device copy (#477): a successful GET of a downloaded session (or the club-level reads while one is
 * downloaded) is kept in IndexedDB after it is returned; offline, such a GET answers from that copy.
 * While changes of a session wait in the outbox (#722), its GETs keep answering from the copy even
 * online, so the screens show what this device saved until the replay has landed it. Every other
 * offline call, and every offline write, refuses exactly as before (writes the rules allow offline
 * go through `outbox/dispatch.ts` before they reach here).
 */
export async function realRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    signal?: AbortSignal
    fields?: Record<string, string>
    /** 'include' for the Queue page's credentialed calls to the Player app (#569, #687) */
    credentials?: RequestCredentials
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const offline = getConnectivity() === 'offline'
  // Browser offline or DevMenu "Simulate offline": the same refusal either way.
  if (method === 'GET' && (offline || (await pathHasPendingWork(sessionIdOfPath(path))))) {
    const kept = await readOfflineBody(path)
    if (kept.found) return kept.body as T
  }
  if (offline) throw new MockError('offline', "You're offline. This needs an internet connection.")
  const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: options.credentials ?? 'same-origin',
      headers:
        options.body === undefined || multipart
          ? undefined
          : { 'Content-Type': 'application/json' },
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (method === 'GET') throw new MockError('retryable', "Couldn't reach ROTRA. Try again.")
    throw new MockError(
      'timeout',
      'No reply came back. Check whether it saved before trying again.',
    )
  }
  const body = (await response.json().catch(() => null)) as (T & ErrorBody) | null
  if (response.ok) {
    if (method === 'GET') rememberGetBody(path, body)
    return body as T
  }
  const message = body?.error?.message ?? 'Something went wrong. Try again.'
  const fields = body?.error?.fields
  const mapped = fields
    ? Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [options.fields?.[key] ?? key, value]),
      )
    : undefined
  const kind = KIND_BY_STATUS[response.status] ?? 'retryable'
  throw new RealRequestError(
    kind,
    (mapped && Object.values(mapped)[0]) || message,
    response.status,
    mapped,
  )
}

/** Money on the wire is `{ amountMinor, currency }` or null. */
export type WireMoney = { amountMinor: number; currency: string } | null
export const minorOf = (money: WireMoney) => money?.amountMinor ?? null
export const msOf = (iso: string) => Date.parse(iso)
export const msOrNull = (iso: string | null) => (iso ? Date.parse(iso) : null)
