'use client'
import { useQuery } from '@tanstack/react-query'
import { getProfileCharacters } from './fetchers'
import { profileCharacterKeys } from './queryKeys'
export function useProfileCharacters() {
  return useQuery({
    queryKey: profileCharacterKeys.shown,
    queryFn: ({ signal }) => getProfileCharacters(signal),
    networkMode: 'always',
    retry: false,
  })
}
