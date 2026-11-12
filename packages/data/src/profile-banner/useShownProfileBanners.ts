'use client'
import { useQuery } from '@tanstack/react-query'
import { getShownProfileBanners } from './fetchers'
import { profileBannerKeys } from './queryKeys'

/**
 * The Player Profile banner dialog (own profile, Edit profile): shown banners only, in upload order.
 * Pass enabled false when there is no dialog to fill (someone else's profile).
 */
export function useShownProfileBanners(enabled = true) {
  return useQuery({
    queryKey: profileBannerKeys.shown,
    queryFn: ({ signal }) => getShownProfileBanners(signal),
    enabled,
    networkMode: 'always',
    retry: false,
  })
}
