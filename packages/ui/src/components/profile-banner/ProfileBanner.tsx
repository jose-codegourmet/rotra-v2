import { cn } from '@rotra/ui/cn'

/** The six predefined banners, in the order players see them (log 2026-11-11-player-profile-banner). */
export const PROFILE_BANNERS = [
  { key: 'court', name: 'Court' },
  { key: 'night', name: 'Night' },
  { key: 'dusk', name: 'Dusk' },
  { key: 'ember', name: 'Ember' },
  { key: 'sun', name: 'Sun' },
  { key: 'stripe', name: 'Stripe' },
] as const

export type ProfileBannerKey = (typeof PROFILE_BANNERS)[number]['key']

/** A player with no banner chosen shows Court. */
export const DEFAULT_PROFILE_BANNER: ProfileBannerKey = 'court'

/** Every banner is drawn from theme tokens, so both themes hold up (the prototypes' .bn-*). */
const BANNER_CLASS: Record<ProfileBannerKey, string> = {
  court: 'bg-[linear-gradient(135deg,var(--accent-dim),var(--accent)_55%,var(--accent-subtle))]',
  night: 'bg-[linear-gradient(135deg,var(--elev),var(--overlay)_60%,var(--border-strong))]',
  dusk: 'bg-[linear-gradient(135deg,var(--overlay),var(--accent-dim))]',
  ember: 'bg-[linear-gradient(135deg,var(--error),var(--warn))]',
  sun: 'bg-[linear-gradient(135deg,var(--warn),var(--accent))]',
  stripe: 'bg-[repeating-linear-gradient(135deg,var(--accent-dim)_0_14px,var(--elev)_14px_28px)]',
}

/** Unknown or missing keys fall back to Court. */
export function profileBannerKey(key?: string | null): ProfileBannerKey {
  return PROFILE_BANNERS.some((banner) => banner.key === key)
    ? (key as ProfileBannerKey)
    : DEFAULT_PROFILE_BANNER
}

/** “Court”, “Night”, …; unknown keys give Court. */
export function profileBannerName(key?: string | null) {
  const resolved = profileBannerKey(key)
  return PROFILE_BANNERS.find((banner) => banner.key === resolved)?.name ?? 'Court'
}

/** The background classes for a predefined banner (swatches, Admin tiles). */
export function profileBannerClass(key?: string | null) {
  return BANNER_CLASS[profileBannerKey(key)]
}

export type ProfileBannerProps = {
  /** A predefined banner key; unknown or missing keys draw Court */
  bannerKey?: string | null
  /** An uploaded banner (Admin library): wins over bannerKey, centred-cropped to fill */
  imageUrl?: string | null
  /**
   * The profile cards' strip (2026-11-13-profile-card-name-layout, third pass): only the top half of
   * the 5:2 art, a full-width 5:1 strip. Drawn banners stretch to twice the strip's height from the
   * top; uploaded images cover it from the top.
   */
  strip?: boolean
  className?: string
}

/**
 * The banner art alone: a predefined token gradient or an uploaded 5:2 image (older 3:1 uploads are
 * centre-cropped to fill). Decorative (aria-hidden); the parent sets its size. Used by ProfileHero,
 * BannerSheet tiles and the Admin banners grid.
 */
export function ProfileBanner({ bannerKey, imageUrl, strip, className }: ProfileBannerProps) {
  if (imageUrl)
    return (
      <span
        aria-hidden
        className={cn('block overflow-hidden bg-elev', strip && 'aspect-[5/1] w-full', className)}
      >
        {/* biome-ignore lint/performance/noImgElement: banners are uploaded data or storage URLs, not optimised assets */}
        <img
          src={imageUrl}
          alt=""
          className={cn('block size-full object-cover', strip && 'object-top')}
        />
      </span>
    )
  return (
    <span
      aria-hidden
      className={cn(
        'block',
        profileBannerClass(bannerKey),
        strip && 'aspect-[5/1] w-full bg-[length:100%_200%] bg-top',
        className,
      )}
    />
  )
}
