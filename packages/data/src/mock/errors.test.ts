import { describe, expect, it } from 'vitest'
import { isPermissionRefusal, MockError, NotConnectedError } from './errors'

describe('isPermissionRefusal', () => {
  it('is true for a permission refusal', () => {
    expect(isPermissionRefusal(new MockError('permission', 'Not allowed.'))).toBe(true)
  })

  it('is false for a domain that is not connected yet', () => {
    const error = new NotConnectedError()
    expect(error.kind).toBe('permission')
    expect(isPermissionRefusal(error)).toBe(false)
  })

  it('is false for other failures', () => {
    expect(isPermissionRefusal(new MockError('retryable', 'Try again.'))).toBe(false)
    expect(isPermissionRefusal(new Error('boom'))).toBe(false)
  })
})
