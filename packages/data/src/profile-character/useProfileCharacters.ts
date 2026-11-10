'use client'
import { useQuery } from '@tanstack/react-query'
import { listProfileCharacters } from './fetchers'
import { profileCharacterKeys } from './queryKeys'

/**
 * A-CHARACTERS: the whole library for Admin, hidden images included, in upload order
 * (ProfileCharacter[]). `enabled: false` waits for the platform-owner session. Players use
 * useShownProfileCharacters instead.
 */
export function useProfileCharacters(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: profileCharacterKeys.list,
    queryFn: ({ signal }) => listProfileCharacters(signal),
    enabled: options.enabled ?? true,
    networkMode: 'always',
    retry: false,
  })
}
