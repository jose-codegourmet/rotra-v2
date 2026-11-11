'use client'

import {
  PROFILE_BANNER_UNDO_MS,
  profileBannerDeletedToast,
  profileBannerName,
} from '@rotra/data/profile-banner/rules'
import {
  useAddProfileBanners,
  useDeleteProfileBanner,
  useRestoreProfileBanner,
  useSetProfileBannerShown,
} from '@rotra/data/profile-banner/useProfileBannerMutations'
import { useProfileBanners } from '@rotra/data/profile-banner/useProfileBanners'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileBannersPage } from '@rotra/ui/profile-banners-page'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { ProfileBannersSkeleton } from './ProfileBannersSkeleton'

/**
 * A-BANNERS: the platform owner's profile banner library, built like Profile characters. Click a
 * banner to hide or show it, × deletes it with a 6-second Undo, and the drop zone takes several
 * images at once with an Uploading N of M bar. At least 2 stay shown; a refusal and the offline
 * error come back from the mutations as messages and show as toasts, with nothing changed.
 */
export function ProfileBanners() {
  const banners = useProfileBanners()
  const add = useAddProfileBanners()
  const setShown = useSetProfileBannerShown()
  const remove = useDeleteProfileBanner()
  const restore = useRestoreProfileBanner()
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null)
  const denied = useDenyOnPermissionError(banners.error)

  if (denied) return null

  const list = banners.data ?? []

  const onFiles = (files: File[]) => {
    if (!files.length) return
    setUpload({ done: 0, total: files.length })
    add.mutate(
      { files, onProgress: (done, total) => setUpload({ done, total }) },
      {
        onSuccess: (result) => {
          if (result.addedMessage) toast(result.addedMessage)
          if (result.notAddedMessage) toast(result.notAddedMessage)
        },
        onError: (error) => toast.error(error.message),
        onSettled: () => setUpload(null),
      },
    )
  }

  const onToggle = (id: string) => {
    const banner = list.find((item) => item.id === id)
    if (!banner) return
    setShown.mutate(
      { id, shown: !banner.shown },
      { onError: (error) => toast.error(error.message) },
    )
  }

  const onDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: (deleted) =>
        toast.success(profileBannerDeletedToast(deleted), {
          duration: PROFILE_BANNER_UNDO_MS,
          action: {
            label: 'Undo',
            onClick: () =>
              restore.mutate(deleted, { onError: (error) => toast.error(error.message) }),
          },
        }),
      onError: (error) => toast.error(error.message),
    })
  }

  if (banners.isError && !banners.data)
    return (
      <>
        <PageHeader title="Profile banners" />
        <Card>
          <ErrorState
            title="Couldn't load the profile banners."
            onRetry={() => void banners.refetch()}
            retrying={banners.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        </Card>
      </>
    )
  if (!banners.data)
    return (
      <>
        <PageHeader title="Profile banners" />
        <ProfileBannersSkeleton />
      </>
    )

  return (
    <ProfileBannersPage
      banners={list.map((banner) => ({
        id: banner.id,
        name: profileBannerName(banner),
        shown: banner.shown,
        imageUrl: banner.image || null,
        bannerKey: banner.image ? null : banner.id,
      }))}
      onFiles={onFiles}
      onToggle={onToggle}
      onDelete={onDelete}
      upload={upload}
    />
  )
}
