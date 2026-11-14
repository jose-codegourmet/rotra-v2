import { requireAdminOnline } from '../admin-account/fetchers'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { profileBanners as seed } from '../fixtures/profileBanners'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { RealRequestError } from '../real/client'
import { isRealDataMode } from '../real/mode'
import {
  realAddProfileBanner,
  realDeleteProfileBanner,
  realGetShownProfileBanners,
  realListProfileBanners,
  realRestoreProfileBanner,
  realSetDefaultProfileBanner,
  realSetProfileBannerShown,
} from '../real/profile-banner'
import { cropProfileBannerToWide } from './crop'
import {
  defaultProfileBannerId,
  inBannerUploadOrder,
  PROFILE_BANNER_ALREADY_BACK,
  PROFILE_BANNER_DEFAULT_HIDDEN,
  PROFILE_BANNER_DEFAULT_REFUSAL,
  PROFILE_BANNER_DELETE_REFUSAL,
  PROFILE_BANNER_HIDE_REFUSAL,
  PROFILE_BANNER_MISSING,
  profileBannerBelowMinimum,
  profileBannerSummary,
  profileBannersAddedMessage,
  profileBannersNotAddedMessage,
  profileBannerUnreadable,
  profileBannerUploadRefusal,
  resolveProfileBanner,
} from './profileBanner.rules'
import type { AddProfileBannersResult, ProfileBanner } from './profileBanner.types'

// Keeps every library banner that was hidden, deleted or uploaded, so a player's stored banner id
// still resolves after Admin deletes it (see ProfileBanner).
const retainedBanners = new Map(seed.map((b) => [b.id, b]))

function retain<T extends readonly ProfileBanner[]>(banners: T) {
  for (const banner of banners) retainedBanners.set(banner.id, banner)
  return banners
}

/** The Player picker: shown banners only, in upload order. */
export async function getShownProfileBanners(signal?: AbortSignal) {
  if (isRealDataMode()) return inBannerUploadOrder(retain(await realGetShownProfileBanners(signal)))
  await delay(150, signal)
  requireOnline()
  return inBannerUploadOrder(retain(readMockState().profileBanners).filter((b) => b.shown))
}

/** A-BANNERS: the whole library, hidden banners included, in upload order. */
export async function listProfileBanners(signal?: AbortSignal): Promise<ProfileBanner[]> {
  if (isRealDataMode()) return inBannerUploadOrder(retain(await realListProfileBanners(signal)))
  await delay(150, signal)
  return inBannerUploadOrder(readMockState().profileBanners)
}

/**
 * Mock mode: the banner a stored `bannerId` draws, with the default rule (null → Court while shown,
 * else the first shown banner). Real mode gets the same answer from the server's profile projection.
 */
export function resolveMockProfileBanner(bannerId: string | null | undefined) {
  const library = readMockState().profileBanners
  return resolveProfileBanner(
    bannerId,
    (id) => library.find((b) => b.id === id) ?? retainedBanners.get(id),
    inBannerUploadOrder(library.filter((b) => b.shown)),
  )
}

/** Whether a player can newly pick this banner: it is in the library and shown. */
export function isProfileBannerShown(id: string) {
  return readMockState().profileBanners.some((b) => b.id === id && b.shown)
}

function find(draft: { profileBanners: ProfileBanner[] }, id: string) {
  const banner = draft.profileBanners.find((b) => b.id === id)
  if (!banner) throw new MockError('conflict', PROFILE_BANNER_MISSING)
  return banner
}

/**
 * A-BANNERS › upload (several files at once). Each file is checked (PNG, JPG or WebP, up to 2 MB),
 * cropped to a centred 5:2 in the browser and saved shown, after the last banner. Rejected files are
 * listed in `notAdded`/`notAddedMessage`; they never fail the batch. `onProgress(done, total)` runs
 * after each file (the Uploading N of M bar). Offline → MockError('offline'), nothing saved. Real
 * mode saves one banner per request, in order; one the server can't read is listed as unreadable,
 * any other failure stops the batch with that error.
 */
export async function addProfileBanners(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<AddProfileBannersResult> {
  requireAdminOnline()
  const notAdded: string[] = []
  const added: ProfileBanner[] = []
  let done = 0
  for (const file of files) {
    const refusal = profileBannerUploadRefusal(file)
    if (refusal) notAdded.push(refusal)
    else {
      let image: string | null = null
      try {
        image = await cropProfileBannerToWide(file)
      } catch {
        notAdded.push(profileBannerUnreadable(file.name))
      }
      if (image !== null) {
        const saved = await saveBanner(image).catch((error: unknown) => {
          if (!(error instanceof RealRequestError) || error.status !== 422) throw error
          notAdded.push(profileBannerUnreadable(file.name))
          return null
        })
        if (saved) added.push(saved)
      }
    }
    onProgress?.(++done, files.length)
  }
  return {
    added,
    notAdded,
    addedMessage: added.length ? profileBannersAddedMessage(added.length) : null,
    notAddedMessage: notAdded.length ? profileBannersNotAddedMessage(notAdded) : null,
  }
}

async function saveBanner(image: string): Promise<ProfileBanner> {
  if (isRealDataMode()) {
    const banner = await realAddProfileBanner(image)
    retainedBanners.set(banner.id, banner)
    return banner
  }
  return adminMutation(350, (draft) => {
    checkMockSave()
    const banner: ProfileBanner = {
      id: crypto.randomUUID(),
      image,
      shown: true,
      uploadedAt: Math.max(Date.now(), ...draft.profileBanners.map((b) => b.uploadedAt + 1)),
      number: Math.max(0, ...draft.profileBanners.map((b) => b.number)) + 1,
    }
    draft.profileBanners.push(banner)
    retainedBanners.set(banner.id, banner)
    appendAdminAudit(draft, {
      action: 'profile_banner_added',
      targetType: 'profile_banner',
      targetId: banner.id,
      summary: profileBannerSummary.added(banner),
    })
    return structuredClone(banner)
  })
}

/**
 * A-BANNERS › click a banner: hide or show it. Hiding one of only 2 shown banners rejects with
 * MockError('conflict', PROFILE_BANNER_HIDE_REFUSAL). The same value as now changes nothing.
 */
export function setProfileBannerShown(input: { id: string; shown: boolean }) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realSetProfileBannerShown(input)
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    const banner = find(draft, input.id)
    if (banner.shown === input.shown) return structuredClone(banner)
    if (!input.shown && banner.id === defaultProfileBannerId(draft.profileBanners))
      throw new MockError('conflict', PROFILE_BANNER_DEFAULT_REFUSAL)
    if (!input.shown && profileBannerBelowMinimum(banner, draft.profileBanners))
      throw new MockError('conflict', PROFILE_BANNER_HIDE_REFUSAL)
    banner.shown = input.shown
    appendAdminAudit(draft, {
      action: input.shown ? 'profile_banner_shown' : 'profile_banner_hidden',
      targetType: 'profile_banner',
      targetId: banner.id,
      summary: input.shown
        ? profileBannerSummary.shown(banner)
        : profileBannerSummary.hidden(banner),
    })
    return structuredClone(banner)
  })
}

/**
 * A-BANNERS › ×: delete a banner. Deleting a shown banner when only 2 are shown rejects with
 * MockError('conflict', PROFILE_BANNER_DELETE_REFUSAL); a hidden banner can always go. Resolves with
 * the deleted banner, which Undo passes to restoreProfileBanner. Players who use it keep it.
 */
export function deleteProfileBanner(id: string) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realDeleteProfileBanner(id).then((deleted) => {
      retainedBanners.set(deleted.id, deleted)
      return deleted
    })
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    const banner = find(draft, id)
    if (banner.id === defaultProfileBannerId(draft.profileBanners))
      throw new MockError('conflict', PROFILE_BANNER_DEFAULT_REFUSAL)
    if (profileBannerBelowMinimum(banner, draft.profileBanners))
      throw new MockError('conflict', PROFILE_BANNER_DELETE_REFUSAL)
    retainedBanners.set(banner.id, structuredClone(banner))
    draft.profileBanners = draft.profileBanners.filter((b) => b.id !== id)
    appendAdminAudit(draft, {
      action: 'profile_banner_deleted',
      targetType: 'profile_banner',
      targetId: id,
      summary: profileBannerSummary.deleted(banner),
    })
    return structuredClone(banner)
  })
}

/**
 * A-BANNERS › Make default (D-2026-11-13-03): applies at once; the banner must be shown. Resolves
 * with `{ banner, previousId }` so Undo can make the previous default the default again. The same
 * banner as now changes nothing. Real mode saves `profile_banners.is_default` on the Admin server,
 * which refuses a hidden banner the same way.
 */
export function setDefaultProfileBanner(id: string): Promise<{
  banner: ProfileBanner
  previousId: string
}> {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realSetDefaultProfileBanner(id)
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    const banner = find(draft, id)
    const previousId = defaultProfileBannerId(draft.profileBanners)
    if (previousId === banner.id) return { banner: structuredClone(banner), previousId }
    if (!banner.shown) throw new MockError('conflict', PROFILE_BANNER_DEFAULT_HIDDEN)
    const previous = draft.profileBanners.find((b) => b.id === previousId)
    for (const b of draft.profileBanners) b.isDefault = b.id === banner.id
    appendAdminAudit(draft, {
      action: 'profile_banner_default',
      targetType: 'profile_banner',
      targetId: banner.id,
      summary: profileBannerSummary.madeDefault(banner, previous),
    })
    return { banner: structuredClone(banner), previousId }
  })
}

/**
 * Undo of a delete: puts the banner back with its old shown state and upload time, so it returns to
 * the same place. Rejects with MockError('conflict') when it is already back.
 */
export function restoreProfileBanner(banner: ProfileBanner) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realRestoreProfileBanner(banner.id)
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    if (draft.profileBanners.some((b) => b.id === banner.id))
      throw new MockError('conflict', PROFILE_BANNER_ALREADY_BACK)
    draft.profileBanners = inBannerUploadOrder([...draft.profileBanners, structuredClone(banner)])
    appendAdminAudit(draft, {
      action: 'profile_banner_restored',
      targetType: 'profile_banner',
      targetId: banner.id,
      summary: profileBannerSummary.restored(banner),
    })
    return structuredClone(banner)
  })
}
