'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubVenues } from './fetchers'
import { clubVenueKeys } from './queryKeys'
export function useClubVenues() {
  return useQuery({ queryKey: [...clubVenueKeys.all, 'list'], queryFn: () => getClubVenues() })
}
