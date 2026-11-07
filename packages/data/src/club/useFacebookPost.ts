'use client'
import { useQuery } from '@tanstack/react-query'
import { clubKeys } from './queryKeys'
import { getFacebookPost } from './settings'
/** Built fresh each time the dialog opens, so it always lists the current roster and template. */
export function useFacebookPost(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: [...clubKeys.all, 'post', sessionId],
    queryFn: () => getFacebookPost(sessionId),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}
