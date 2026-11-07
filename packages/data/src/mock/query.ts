'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
/** Domain hooks share invalidation, never Redux copies of query data. */
export function useMockMutation<Input, Output>(
  mutationFn: (input: Input) => Promise<Output>,
  options?: {
    /** Resolve as soon as the command is confirmed; refetch in the background (single-action confirms). */
    backgroundRefresh?: boolean
  },
) {
  const client = useQueryClient()
  const refresh = () =>
    client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  return useMutation({
    mutationFn,
    // Returning the promise keeps the mutation pending until every active query has refetched.
    onSuccess: options?.backgroundRefresh
      ? () => {
          void refresh()
        }
      : refresh,
  })
}
