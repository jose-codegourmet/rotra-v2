'use client'
import { useQuery } from '@tanstack/react-query'
import { getProfileCharacters } from './fetchers'
import { profileCharacterKeys } from './queryKeys'

/** Player pickers (Player, Queue club editor, Admin edit-player): shown images only, in upload order. */
export function useShownProfileCharacters() {
  return useQuery({
    queryKey: profileCharacterKeys.shown,
    queryFn: ({ signal }) => getProfileCharacters(signal),
    networkMode: 'always',
    retry: false,
  })
}
