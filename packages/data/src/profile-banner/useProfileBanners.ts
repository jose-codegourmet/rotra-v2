'use client'
import { useQuery } from '@tanstack/react-query'
import { listProfileBanners } from './fetchers'
import { profileBannerKeys } from './queryKeys'

/**
 * A-BANNERS: the whole library for Admin, hidden banners included, in upload order
 * (ProfileBanner[]). `enabled: false` waits for the platform-owner session. Players use
 * useShownProfileBanners instead.
 */
export function useProfileBanners(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: profileBannerKeys.list,
    queryFn: ({ signal }) => listProfileBanners(signal),
    enabled: options.enabled ?? true,
    networkMode: 'always',
    retry: false,
  })
}
