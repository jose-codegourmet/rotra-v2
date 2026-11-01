import { NOT_CONNECTED_MESSAGE } from '../real/mode'

/**
 * Mock transport failures, suitable for mapping to retry, permission, conflict or offline UI.
 * 'timeout' means no reply came back: the write may have been applied, so check before retrying.
 */
export type MockErrorKind = 'retryable' | 'permission' | 'conflict' | 'offline' | 'timeout'

export class MockError extends Error {
  override readonly name = 'MockError'

  constructor(
    readonly kind: MockErrorKind,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
  }
}

/**
 * A write based on an outdated revision (kind 'conflict'). Carries what is current now so the screen
 * can compare and let the person choose; never last-write-wins.
 */
export class ConflictError<T> extends MockError {
  constructor(
    readonly current: T,
    message: string,
  ) {
    super('conflict', message)
  }
}

/**
 * Real data mode reached a domain with no Route Handler yet. Kind 'permission' so the screen refuses
 * truthfully instead of showing mock data, but it is not an access denial: the account is allowed.
 */
export class NotConnectedError extends MockError {
  constructor() {
    super('permission', NOT_CONNECTED_MESSAGE)
  }
}

/** A real refusal (not found or not allowed). A domain that is only not connected yet is not one. */
export const isPermissionRefusal = (error: unknown) =>
  error instanceof MockError && error.kind === 'permission' && !(error instanceof NotConnectedError)
