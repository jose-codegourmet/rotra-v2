'use client'
import type { PlayerProfile } from '@rotra/data/player/types'
import { useSetMyProfileBanner } from '@rotra/data/player/useSetMyProfileBanner'
import { profileBannerName } from '@rotra/data/profile-banner/rules'
import { useShownProfileBanners } from '@rotra/data/profile-banner/useShownProfileBanners'
import { BannerSheet } from '@rotra/ui/banner-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

/**
 * The Profile banner dialog (#765) for the own profile and Edit profile: the shown banners as a
 * local draft; Done saves with useSetMyProfileBanner and toasts “Banner updated”, dismissing
 * discards. Pass null for someone else's profile (no sheet).
 */
export function useBannerSheet(profile: PlayerProfile | null | undefined) {
  const [open, setOpen] = useState(false)
  const banners = useShownProfileBanners(Boolean(profile))
  const mutation = useSetMyProfileBanner()
  const sheet = profile ? (
    <BannerSheet
      open={open}
      onOpenChange={setOpen}
      value={profile.bannerKey}
      options={banners.data?.map((banner) => ({
        key: banner.id,
        name: profileBannerName(banner),
        imageUrl: banner.image || null,
      }))}
      disabled={!banners.data}
      isPending={mutation.isPending}
      onCommit={async (bannerId) => {
        await mutation.mutateAsync(bannerId)
        toast('Banner updated')
      }}
    />
  ) : null
  return {
    sheet,
    openSheet: () => {
      if (banners.isError) {
        toast.error(banners.error.message)
        void banners.refetch()
        return
      }
      setOpen(true)
    },
  }
}
