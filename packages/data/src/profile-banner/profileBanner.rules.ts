import type { ProfileBanner, ResolvedProfileBanner } from './profileBanner.types'

/** rotra-admin.html BANNER_MIN_ACTIVE: players always have a choice */
export const PROFILE_BANNER_MIN_SHOWN = 2
/** rotra-admin.html BANNER_MAX_BYTES: 2 MB per image */
export const PROFILE_BANNER_MAX_BYTES = 2 * 1024 * 1024
/** Accepted image types (rotra-admin.html `accept` and type check) */
export const PROFILE_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
/** Value for the file input's `accept` attribute */
export const PROFILE_BANNER_ACCEPT = PROFILE_BANNER_TYPES.join(',')
/** rotra-admin.html toastUndo: how long the Undo button stays on screen after a delete */
export const PROFILE_BANNER_UNDO_MS = 6000

/** rotra-admin.html BANNER_SEEDS: the six seeded banners, drawn from theme tokens by id */
export const SEEDED_PROFILE_BANNER_NAMES: Readonly<Record<string, string>> = {
  court: 'Court',
  night: 'Night',
  dusk: 'Dusk',
  ember: 'Ember',
  sun: 'Sun',
  stripe: 'Stripe',
}

/** The default banner while it is shown (owner, 2026-11-12). */
export const DEFAULT_PROFILE_BANNER_ID = 'court'

/** rotra-admin.html bannerName: a seeded name, or "Banner N" for an upload */
export const profileBannerName = (banner: Pick<ProfileBanner, 'id' | 'number'>) =>
  SEEDED_PROFILE_BANNER_NAMES[banner.id] ?? `Banner ${banner.number}`

export const shownProfileBannerCount = (banners: readonly Pick<ProfileBanner, 'shown'>[]) =>
  banners.filter((b) => b.shown).length

/** Hiding a shown banner when only the minimum is shown (bannerToggle). */
export const PROFILE_BANNER_HIDE_REFUSAL = `Keep at least ${PROFILE_BANNER_MIN_SHOWN} banners shown, so players have a choice.`
/** Deleting a shown banner when only the minimum is shown (bannerDelete). */
export const PROFILE_BANNER_DELETE_REFUSAL = `Keep at least ${PROFILE_BANNER_MIN_SHOWN} banners shown. Upload or show another one first.`
export const PROFILE_BANNER_MISSING = 'This banner is no longer in the library. Reload the list.'
export const PROFILE_BANNER_ALREADY_BACK = 'This banner is already back in the library.'
/** Hiding or deleting the default banner (A-BANNERS, D-2026-11-13-03). */
export const PROFILE_BANNER_DEFAULT_REFUSAL =
  'This is the default banner. Make another banner the default first.'
/** The default tile's title (hover). */
export const PROFILE_BANNER_DEFAULT_TITLE =
  'The default banner. Make another banner the default before hiding this one.'
/** Make default with nothing to change, or a hidden banner. */
export const PROFILE_BANNER_DEFAULT_HIDDEN = 'Show this banner before making it the default.'

/** The library's default banner: the one marked Default, else Court (the seed default). */
export const defaultProfileBannerId = (
  banners: readonly Pick<ProfileBanner, 'id' | 'isDefault'>[],
) => banners.find((b) => b.isDefault)?.id ?? DEFAULT_PROFILE_BANNER_ID

/** “Dusk is now the default banner.” (shown with Undo) */
export const profileBannerDefaultToast = (b: Named) =>
  `${profileBannerName(b)} is now the default banner.`
/** A player picked a banner that is hidden, deleted or unknown. */
export const PROFILE_BANNER_NOT_PICKABLE = 'Choose a banner.'

/**
 * Whether hiding (or deleting) a banner is refused by the minimum-shown rule: only a shown banner
 * counts, and only when no more than the minimum are shown. A hidden banner can always go.
 */
export const profileBannerBelowMinimum = (
  banner: Pick<ProfileBanner, 'shown'>,
  banners: readonly Pick<ProfileBanner, 'shown'>[],
) => banner.shown && shownProfileBannerCount(banners) <= PROFILE_BANNER_MIN_SHOWN

/** Why a file is rejected, or null when it can be cropped and added (addBannerFiles). */
export function profileBannerUploadRefusal(file: { name: string; type: string; size: number }) {
  if (!(PROFILE_BANNER_TYPES as readonly string[]).includes(file.type))
    return `${file.name} isn't a PNG, JPG or WebP image`
  if (file.size > PROFILE_BANNER_MAX_BYTES) return `${file.name} is over 2 MB`
  return null
}

export const profileBannerUnreadable = (name: string) => `${name} couldn't be read`

export const profileBannersAddedMessage = (count: number) =>
  `${count} ${count === 1 ? 'banner' : 'banners'} added and shown to players.`

export const profileBannersNotAddedMessage = (reasons: readonly string[]) =>
  `Not added: ${reasons.join('; ')}.`

type Named = Pick<ProfileBanner, 'id' | 'number'>
/** Activity log lines (rotra-admin.html `log('banner', ...)`) */
export const profileBannerSummary = {
  added: (b: Named) => `Uploaded ${profileBannerName(b)}.`,
  shown: (b: Named) => `Showed ${profileBannerName(b)} in the player picker.`,
  hidden: (b: Named) => `Hid ${profileBannerName(b)} in the player picker.`,
  deleted: (b: Named) => `Deleted ${profileBannerName(b)}. Players who use it keep it.`,
  restored: (b: Named) => `Undid deleting ${profileBannerName(b)}.`,
  madeDefault: (b: Named, was: Named | undefined) =>
    `Made ${profileBannerName(b)} the default banner (was ${was ? profileBannerName(was) : 'Court'}).`,
}

/** Delete toast text with its Undo button (toastUndo) */
export const profileBannerDeletedToast = (b: Named) => `${profileBannerName(b)} deleted.`

/** Upload order, oldest first: what players and Admin see. */
export const inBannerUploadOrder = <T extends Pick<ProfileBanner, 'uploadedAt'>>(
  list: readonly T[],
) => [...list].sort((a, b) => a.uploadedAt - b.uploadedAt)

const resolved = (banner: Pick<ProfileBanner, 'id' | 'image'>): ResolvedProfileBanner => ({
  bannerKey: banner.id,
  bannerImageUrl: banner.image || null,
})

/**
 * The banner a profile card draws. A chosen banner the library still knows (hidden and deleted ones
 * included, passed through `find`) is kept. Otherwise (null, or an id nobody knows) the default: the
 * shown banner Admin marked Default (D-2026-11-13-03), else Court while it is shown, else the first
 * shown banner in upload order (owner, 2026-11-12). With no banner shown at all, Court.
 */
export function resolveProfileBanner(
  bannerId: string | null | undefined,
  find: (id: string) => Pick<ProfileBanner, 'id' | 'image'> | undefined,
  shownInOrder: readonly Pick<ProfileBanner, 'id' | 'image' | 'isDefault'>[],
): ResolvedProfileBanner {
  const chosen = bannerId ? find(bannerId) : undefined
  if (chosen) return resolved(chosen)
  const fallback =
    shownInOrder.find((b) => b.isDefault) ??
    shownInOrder.find((b) => b.id === DEFAULT_PROFILE_BANNER_ID) ??
    shownInOrder[0] ??
    ({ id: DEFAULT_PROFILE_BANNER_ID, image: '' } as const)
  return resolved(fallback)
}
