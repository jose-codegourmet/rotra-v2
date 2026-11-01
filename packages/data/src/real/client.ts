import { MockError, type MockErrorKind } from '../mock/errors'

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

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * One call to the app's own Route Handlers. Failures become the same `MockError` kinds the screens
 * already handle; a write whose reply never arrives is a 'timeout' (it may have been saved), never
 * a success. `fields` maps service field keys to the form's field names.
 */
export async function realRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH'
    body?: unknown
    signal?: AbortSignal
    fields?: Record<string, string>
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  if (offline())
    throw new MockError('offline', "You're offline. This needs an internet connection.")
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
  if (response.ok) return body as T
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
