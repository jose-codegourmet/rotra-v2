import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ProfileBanner } from '@rotra/ui/profile-banner'
import type { ReactNode } from 'react'
import { type ProfileHeroVariants, profileHeroBannerVariants } from './ProfileHero.variants'

/** The 34 px round accent pencil, on the picture and on the banner. */
const PENCIL =
  'absolute grid size-[34px] cursor-pointer place-items-center rounded-full border-2 border-surface bg-accent p-0 text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export type ProfileHeroProps = ProfileHeroVariants & {
  /** Full name: the initials when there is no picture; under the nickname on the profile card */
  name: string
  /**
   * Profile card: the display name (heading) with the full name under it. Edit profile preview:
   * shown in quotes under the name.
   */
  nickname?: string | null
  /** Photo or character image URL; initials on the accent fill when missing */
  pictureSrc?: string | null
  /** A predefined banner key (court, night, dusk, ember, sun, stripe); missing or unknown = Court */
  bannerKey?: string | null
  /** An uploaded banner from the Admin library; wins over bannerKey */
  bannerImageUrl?: string | null
  /** Opens the full photo (PhotoViewer, #716); only a real picture becomes the view button, initials stay inert */
  onViewPicture?: () => void
  /** The pencil on the picture (own profile, Edit profile preview); hidden when missing */
  onChangePicture?: () => void
  /**
   * The pencil in the banner's top-right corner (own profile, Edit profile preview): opens the
   * Profile banner dialog. Hidden when missing; never on someone else's profile.
   */
  onChangeBanner?: () => void
  /** Under the name and nickname, e.g. the This is you chip */
  badges?: ReactNode
  /** Under the picture row, e.g. the Edit profile preview's helper line */
  children?: ReactNode
  className?: string
}

function PicturePencil({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Change profile picture"
      title="Change profile picture"
      onClick={onClick}
      className={cn(PENCIL, '-right-1.5 -bottom-1.5')}
    >
      <Icon name="edit" className="size-4" />
    </button>
  )
}

/**
 * The top of the profile card (P-PROFILE, P-PUBLIC-PROFILE), the same top as the profile dialog
 * (2026-11-13-player-profile-hero-like-card): the top half of the Profile banner as a 5:1 strip
 * edge to edge (the banner pencil top right on your own), the 88 px picture with a surface ring
 * centred on the strip's bottom edge (its pencil on your own), then the display name (nickname
 * first) with the full name under it when there is a nickname, then the badges. Edit profile › Name
 * keeps the earlier hero as a live preview (placement="preview": 5:2 banner, the picture beside the
 * name, the nickname in quotes). Put it first in a p-4 Card with pt-0.
 */
export function ProfileHero({
  name,
  nickname,
  pictureSrc,
  bannerKey,
  bannerImageUrl,
  onViewPicture,
  onChangePicture,
  onChangeBanner,
  badges,
  children,
  placement = 'card',
  className,
}: ProfileHeroProps) {
  const preview = placement === 'preview'
  // The Edit profile preview is a named group; the profile card is plain layout.
  const Wrapper = preview ? 'section' : 'div'
  const bannerPencil = onChangeBanner ? (
    <button
      type="button"
      aria-label="Change banner"
      title="Change banner"
      onClick={onChangeBanner}
      className={cn(PENCIL, 'top-2.5 right-2.5')}
    >
      <Icon name="edit" className="size-4" />
    </button>
  ) : null
  if (!preview) {
    const displayName = nickname || name
    return (
      <div className={cn('flex min-w-0 flex-col gap-3.5', className)}>
        <div className={profileHeroBannerVariants({ placement })}>
          <ProfileBanner strip bannerKey={bannerKey} imageUrl={bannerImageUrl} />
          {bannerPencil}
        </div>
        <div className="relative z-1 -mt-14 flex min-w-0 flex-col items-start gap-2.5">
          <span className="relative block flex-none">
            <Avatar
              name={name}
              src={pictureSrc ?? undefined}
              size={88}
              tone={pictureSrc ? 'neutral' : 'accent'}
              onView={onViewPicture}
              className="shadow-[0_0_0_5px_var(--surface)]"
            />
            {onChangePicture ? <PicturePencil onClick={onChangePicture} /> : null}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl [overflow-wrap:anywhere]">{displayName}</h1>
            {nickname ? <p className="m-0 text-fg2 [overflow-wrap:anywhere]">{name}</p> : null}
            {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
          </div>
        </div>
        {children}
      </div>
    )
  }
  return (
    <Wrapper
      aria-label="Profile card preview"
      className={cn('flex min-w-0 flex-col gap-3.5', className)}
    >
      <div className={profileHeroBannerVariants({ placement })}>
        <ProfileBanner
          bannerKey={bannerKey}
          imageUrl={bannerImageUrl}
          className="aspect-[5/2] w-full"
        />
        {bannerPencil}
      </div>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="relative block flex-none">
          <Avatar
            name={name}
            src={pictureSrc ?? undefined}
            size={88}
            tone={pictureSrc ? 'neutral' : 'accent'}
            onView={onViewPicture}
          />
          {onChangePicture ? <PicturePencil onClick={onChangePicture} /> : null}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <b className="text-[20px] font-extrabold [overflow-wrap:anywhere]">{name}</b>
          {nickname ? <p className="m-0 text-fg2 [overflow-wrap:anywhere]">“{nickname}”</p> : null}
          {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
      </div>
      {children}
    </Wrapper>
  )
}
