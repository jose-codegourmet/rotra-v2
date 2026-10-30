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
