'use client'
import { useQuery } from '@tanstack/react-query'
import { clubKeys } from './queryKeys'
import { getFacebookPost } from './settings'
export function useFacebookPost(sessionId: string) {
  return useQuery({
    queryKey: [...clubKeys.all, 'post', sessionId],
    queryFn: () => getFacebookPost(sessionId),
  })
}
