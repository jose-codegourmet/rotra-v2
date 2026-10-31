import 'server-only'

/** Every error a service may return. The message is safe to show; it never names private data. */
export const SERVICE_ERRORS = {
  unauthenticated: { status: 401, message: 'Sign in to continue.' },
  wrong_account: { status: 403, message: 'This account cannot use this app.' },
  forbidden: { status: 403, message: 'You do not have access to this.' },
  entitlement_required: { status: 403, message: 'This club does not have an active license.' },
  not_found: { status: 404, message: 'Not found.' },
  conflict: { status: 409, message: 'This changed since you loaded it. Refresh and try again.' },
  invalid: { status: 422, message: 'Check the details and try again.' },
  unavailable: { status: 503, message: 'This is not available right now.' },
} as const

export type ServiceErrorCode = keyof typeof SERVICE_ERRORS

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  readonly status: number
  /** Field-level problems for `invalid`; never private values. */
  readonly fields?: Record<string, string>

  constructor(code: ServiceErrorCode, fields?: Record<string, string>) {
    super(SERVICE_ERRORS[code].message)
    this.name = 'ServiceError'
    this.code = code
    this.status = SERVICE_ERRORS[code].status
    this.fields = fields
  }
}

/** The JSON error body: `{ error: { code, message, fields? } }`. */
export function errorBody(error: ServiceError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  }
}

/** Not-found and forbidden look the same to a caller probing another club's or player's IDs. */
export function denyScope(): never {
  throw new ServiceError('not_found')
}
