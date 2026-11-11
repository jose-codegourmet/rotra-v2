'use client'
import {
  type MutateOptions,
  type MutationFunctionContext,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { Enqueued } from './enqueueRosterOps'
import { getRosterBatch } from './rosterBatch'

export type RosterMutateOptions<Input, Output> = MutateOptions<Output, Error, Input, unknown>

/**
 * The shape the roster hooks keep (#718): `mutate(input, options)` and `isPending`, like a
 * TanStack mutation, but the tap settles at once. `enqueue` lays the change over the roster and
 * answers with the usual outcome, so `onSuccess` toasts right away; a refusal the screen can tell
 * now (a duplicate, a decided request) goes to `onError` at once. The burst itself is sent after
 * 800 ms without another tap; when the server refuses it, the last `onError` passed to this
 * session's batch shows the one error toast, and the burst's rows roll back.
 */
export function useRosterEnqueue<Input, Data>(
  enqueue: (client: QueryClient, input: Input) => Enqueued<Data>,
) {
  type Output = Enqueued<Data>['outcome']
  const client = useQueryClient()
  const context = useMemo<MutationFunctionContext>(() => ({ client, meta: undefined }), [client])
  const [error, setError] = useState<Error | null>(null)
  const mutateAsync = useCallback(
    async (input: Input, options?: RosterMutateOptions<Input, Output>) => {
      let result: Enqueued<Data>
      try {
        result = enqueue(client, input)
      } catch (caught) {
        const failure = caught instanceof Error ? caught : new Error('Something went wrong.')
        setError(failure)
        options?.onError?.(failure, input, undefined, context)
        options?.onSettled?.(undefined, failure, input, undefined, context)
        throw failure
      }
      const onError = options?.onError
      if (onError)
        getRosterBatch(client, result.sessionId).owner.callbacks = {
          onError: (reason) =>
            onError(
              reason instanceof Error ? reason : new Error('Changes could not be saved'),
              input,
              undefined,
              context,
            ),
        }
      setError(null)
      options?.onSuccess?.(result.outcome, input, undefined, context)
      options?.onSettled?.(result.outcome, null, input, undefined, context)
      return result.outcome
    },
    [client, context, enqueue],
  )
  const mutate = useCallback(
    (input: Input, options?: RosterMutateOptions<Input, Output>) => {
      mutateAsync(input, options).catch(() => {})
    },
    [mutateAsync],
  )
  return {
    mutate,
    mutateAsync,
    /** Never pending: the tap is applied at once and the burst saves in the background. */
    isPending: false as const,
    error,
    isError: error != null,
    reset: () => setError(null),
  }
}
