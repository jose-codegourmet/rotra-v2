'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
/** Domain hooks share invalidation, never Redux copies of query data. */
export function useMockMutation<Input, Output>(mutationFn: (input: Input) => Promise<Output>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' }),
  })
}
