'use client'
import { NotConnectedError } from '../mock/errors'
import { useMockMutation } from '../mock/query'
import { keepServerVersion, retryConflict } from '../outbox/conflicts'
import { isRealDataMode } from '../real/mode'

export type ResolveSyncConflictInput = { operationId: string; decision: 'keep-server' | 'retry' }

/**
 * Q-CONFLICT over the outbox (#722, real mode): keep the server's version (the refused change is
 * dropped) or retry it. The mock's two-device conflicts have no supported resolution command.
 */
export function useResolveSyncConflict() {
  return useMockMutation((input: ResolveSyncConflictInput) => {
    if (!isRealDataMode()) throw new NotConnectedError()
    return input.decision === 'keep-server'
      ? keepServerVersion(input.operationId)
      : retryConflict(input.operationId)
  })
}
