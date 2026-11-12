import { type APIRequestContext, request } from '@playwright/test'
import { type AppName, appUrl } from '../stack.ts'

export type ApiReply<T = unknown> = { status: number; body: T }

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(method: string, path: string, status: number, body: unknown) {
    super(`${method} ${path} -> ${status} ${JSON.stringify(body)}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * One app's Route Handlers over HTTP, with its own cookie jar (an APIRequestContext), so the
 * Supabase session cookie from sign-in rides along on every later call.
 */
export class AppClient {
  readonly app: AppName
  readonly context: APIRequestContext

  constructor(app: AppName, context: APIRequestContext) {
    this.app = app
    this.context = context
  }

  /** Any status; never throws on a 4xx/5xx. */
  async send<T = unknown>(method: Method, path: string, body?: unknown): Promise<ApiReply<T>> {
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
    return { status: response.status(), body: parsed as T }
  }

  /** Throws ApiError unless the status is 2xx. */
  async call<T = unknown>(method: Method, path: string, body?: unknown): Promise<T> {
    const reply = await this.send<T>(method, path, body)
    if (reply.status < 200 || reply.status >= 300)
      throw new ApiError(method, path, reply.status, reply.body)
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
