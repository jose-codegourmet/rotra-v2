/** Mock transport failures, suitable for mapping to retry, permission, conflict or offline UI. */
export type MockErrorKind = 'retryable' | 'permission' | 'conflict' | 'offline'

export class MockError extends Error {
  override readonly name = 'MockError'

  constructor(
    readonly kind: MockErrorKind,
    message: string,
  ) {
    super(message)
  }
}
