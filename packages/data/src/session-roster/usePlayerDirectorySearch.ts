'use client'
import { useQuery } from '@tanstack/react-query'
import { playerDirectorySearch } from './mutations'
import { sessionRosterKeys } from './queryKeys'
export function usePlayerDirectorySearch(q: string) {
  return useQuery({
    queryKey: [...sessionRosterKeys.all, ['directory', q]],
    queryFn: () => playerDirectorySearch(q),
  })
}
