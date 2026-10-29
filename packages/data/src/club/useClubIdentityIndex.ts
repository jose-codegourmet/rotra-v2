'use client'

import { useQuery } from '@tanstack/react-query'
import { getClubIdentityIndex } from './fetchers'
import { clubKeys } from './queryKeys'

/** Taken names and usernames for A-ADD-CLUB's takenNames / takenUsernames. */
export function useClubIdentityIndex() {
  return useQuery({
    queryKey: clubKeys.identityIndex(),
    queryFn: ({ signal }) => getClubIdentityIndex(signal),
  })
}
