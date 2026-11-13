/**
 * One banner in the platform owner's profile banner library (rotra-admin.html `S.banners`,
 * `profile_banners`).
 *
 * How a player refers to a banner: `players.banner_id` holds the banner's id (null = the default
 * banner, see `resolveProfileBanner`). Hiding or deleting a library banner changes only the library;
 * players who already use it keep it. Only the picker (`useShownProfileBanners`) and the choose check
 * of `setMyProfileBanner` look at `shown`, so nobody can newly pick a hidden banner. Players never
 * upload a banner.
 */
export type ProfileBanner = {
  /** A seeded key (court, night, dusk, ember, sun, stripe) or an uploaded UUID */
  id: string
  /** '' for a seeded banner the apps draw from theme tokens by id; else the 5:2 image URL or data URL */
  image: string
  /** Shown to players in the picker; hidden banners stay in the library, dimmed in Admin */
  shown: boolean
  /** Upload time (ms); the order players and Admin see. Strictly increasing per upload. */
  uploadedAt: number
  /** Running upload number; Admin labels an upload "Banner <number>" */
  number: number
  /**
   * The default banner (proposed `profile_banners.is_default`, D-2026-11-13-03): drawn on every
   * profile that hasn't picked one, and on guests and unclaimed profiles. At most one banner has it;
   * missing reads as false (real mode has no column yet, so Court stays the default there).
   */
  isDefault?: boolean
}

/** What a profile card draws: the banner id (the ProfileBanner key) and its image, if uploaded. */
export type ResolvedProfileBanner = {
  /** The banner's id; a seeded id is drawn from theme tokens */
  bannerKey: string
  /** An uploaded banner's image; null for a seeded, token-drawn banner */
  bannerImageUrl: string | null
}

/** Result of one Admin upload batch: accepted files are saved, rejected ones are only listed. */
export type AddProfileBannersResult = {
  added: ProfileBanner[]
  /** One reason per rejected file, e.g. "a.gif isn't a PNG, JPG or WebP image" */
  notAdded: string[]
  /** "N banners added and shown to players." or null when nothing was added */
  addedMessage: string | null
  /** "Not added: <reason>; <reason>." or null when every file was accepted */
  notAddedMessage: string | null
}
