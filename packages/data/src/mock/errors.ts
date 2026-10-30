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
