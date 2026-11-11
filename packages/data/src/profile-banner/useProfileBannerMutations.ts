'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import {
  addProfileBanners,
  deleteProfileBanner,
  restoreProfileBanner,
  setProfileBannerShown,
} from './fetchers'
import type { ProfileBanner } from './profileBanner.types'
import { profileBannerKeys } from './queryKeys'

/** Library, the player picker and the Record of actions all change together. */
function useSettled() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: profileBannerKeys.all }),
      client.invalidateQueries({ queryKey: adminAuditKeys.all }),
    ])
}
const options = { networkMode: 'always', retry: false } as const

/**
 * mutate({ files, onProgress }) → AddProfileBannersResult; show `addedMessage` and
 * `notAddedMessage` as toasts. `onProgress(done, total)` drives the Uploading N of M bar.
 */
export function useAddProfileBanners() {
  return useMutation({
    mutationFn: (input: { files: File[]; onProgress?: (done: number, total: number) => void }) =>
      addProfileBanners(input.files, input.onProgress),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate({ id, shown }) → the saved ProfileBanner. The refusal below 2 shown is a MockError('conflict'). */
export function useSetProfileBannerShown() {
  return useMutation({
    mutationFn: (input: { id: string; shown: boolean }) => setProfileBannerShown(input),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate(id) → the deleted ProfileBanner, to hand to useRestoreProfileBanner for Undo. */
export function useDeleteProfileBanner() {
  return useMutation({
    mutationFn: (id: string) => deleteProfileBanner(id),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate(ProfileBanner) → the restored ProfileBanner (Undo within PROFILE_BANNER_UNDO_MS). */
export function useRestoreProfileBanner() {
  return useMutation({
    mutationFn: (banner: ProfileBanner) => restoreProfileBanner(banner),
    onSettled: useSettled(),
    ...options,
  })
}
