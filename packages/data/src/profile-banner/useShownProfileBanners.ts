'use client'
import { useQuery } from '@tanstack/react-query'
import { getShownProfileBanners } from './fetchers'
import { profileBannerKeys } from './queryKeys'

/** The Player banner picker (Edit profile › Name): shown banners only, in upload order. */
export function useShownProfileBanners() {
  return useQuery({
    queryKey: profileBannerKeys.shown,
    queryFn: ({ signal }) => getShownProfileBanners(signal),
    networkMode: 'always',
    retry: false,
  })
}
