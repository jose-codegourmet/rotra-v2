import 'server-only'
import { ServiceError } from './errors'

/** The JSON object a Route Handler received; anything else is `invalid`. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError('invalid')
  return body as Record<string, unknown>
}

export const text = (value: unknown) => (typeof value === 'string' ? value : '')
export const int = (value: unknown) => (typeof value === 'number' ? value : Number.NaN)
export const intOrNull = (value: unknown) =>
  value === null || value === undefined ? null : int(value)
