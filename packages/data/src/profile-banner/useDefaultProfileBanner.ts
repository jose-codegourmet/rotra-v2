'use client'
import { isRealDataMode } from '../real/mode'
import { resolveMockProfileBanner } from './fetchers'
import { DEFAULT_PROFILE_BANNER_ID, resolveProfileBanner } from './profileBanner.rules'
import type { ResolvedProfileBanner } from './profileBanner.types'
import { useShownProfileBanners } from './useShownProfileBanners'

/** Real mode, before the shown list arrives (or when it can't be read): the seed default. */
const COURT: ResolvedProfileBanner = { bannerKey: DEFAULT_PROFILE_BANNER_ID, bannerImageUrl: null }

/**
 * The default banner Admin picks (D-2026-11-13-03), for cards with no banner of their own (clubs,
 * and profiles still loading). Read from the shown banners, so it follows Make default in both modes.
 * Never empty: while loading, mock mode resolves from the mock store and real mode draws Court.
 */
export function useDefaultProfileBanner(): ResolvedProfileBanner {
  const shown = useShownProfileBanners()
  if (shown.data) return resolveProfileBanner(null, () => undefined, shown.data)
  return isRealDataMode() ? COURT : resolveMockProfileBanner(null)
}
