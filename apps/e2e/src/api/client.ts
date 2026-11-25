import { type APIRequestContext, request } from '@playwright/test'
import { type AppName, appUrl } from '../stack.ts'

/** `requestId` is the Go API's X-Request-Id: look it up in the attached Go API log. */
export type ApiReply<T = unknown> = { status: number; body: T; requestId: string }

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  readonly requestId: string
  constructor(method: string, path: string, status: number, body: unknown, requestId = '') {
    super(
      `${method} ${path} -> ${status} ${JSON.stringify(body)}${requestId ? ` [request ${requestId}]` : ''}`,
    )
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.requestId = requestId
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * One app's `/api` over HTTP (the app forwards it to the Go API), with its own cookie jar (an
 * APIRequestContext), so the sign-in cookies ride along on every later call. Like the real apps
 * (packages/data/src/real/client.ts), a 401 `expired` (the 15 minute access pass ran out on the test
 * clock) gets one shared refresh and one retry.
 */
export class AppClient {
  readonly app: AppName
  readonly context: APIRequestContext

  constructor(app: AppName, context: APIRequestContext) {
    this.app = app
    this.context = context
  }

  private refreshing: Promise<void> | null = null

  /** One refresh at a time per client; the Go refresh cookie rotates server-side. */
  private refresh() {
    this.refreshing ??= (async () => {
      const response = await this.context.fetch('/api/auth/refresh', { method: 'POST', data: {} })
      if (!response.ok())
        throw new ApiError(
          'POST',
          '/api/auth/refresh',
          response.status(),
          await response.text(),
          response.headers()['x-request-id'] ?? '',
        )
    })().finally(() => {
      this.refreshing = null
    })
    return this.refreshing
  }

  /** Any status; never throws on a 4xx/5xx. */
  async send<T = unknown>(method: Method, path: string, body?: unknown): Promise<ApiReply<T>> {
    const first = await this.sendOnce<T>(method, path, body)
    const code = (first.body as { error?: { code?: string } } | null)?.error?.code
    if (first.status !== 401 || code !== 'expired' || path.startsWith('/api/auth/refresh'))
      return first
    await this.refresh()
    return this.sendOnce<T>(method, path, body)
  }

  private async sendOnce<T>(method: Method, path: string, body?: unknown): Promise<ApiReply<T>> {
    const response = await this.context.fetch(path, {
      method,
      ...(body === undefined ? {} : { data: body }),
    })
    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }
    return {
      status: response.status(),
      body: parsed as T,
      requestId: response.headers()['x-request-id'] ?? '',
    }
  }

  /** Throws ApiError unless the status is 2xx. */
  async call<T = unknown>(method: Method, path: string, body?: unknown): Promise<T> {
    const reply = await this.send<T>(method, path, body)
    if (reply.status < 200 || reply.status >= 300)
      throw new ApiError(method, path, reply.status, reply.body, reply.requestId)
    return reply.body
  }

  get<T = unknown>(path: string) {
    return this.call<T>('GET', path)
  }
  post<T = unknown>(path: string, body: unknown = {}) {
    return this.call<T>('POST', path, body)
  }
  patch<T = unknown>(path: string, body: unknown = {}) {
    return this.call<T>('PATCH', path, body)
  }
  delete<T = unknown>(path: string, body: unknown = {}) {
    return this.call<T>('DELETE', path, body)
  }

  dispose() {
    return this.context.dispose()
  }
}

/** A client with an empty cookie jar (a signed-out visitor). */
export async function anonymous(app: AppName) {
  return new AppClient(app, await request.newContext({ baseURL: appUrl(app) }))
}
