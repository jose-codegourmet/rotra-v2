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
  /** Full name: the heading, and the initials when there is no picture */
  name: string
  /** Shown in quotes under the name */
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

/**
 * The top of the profile card (P-PROFILE, P-PUBLIC-PROFILE): a 5:2 Profile banner edge to edge with
 * nothing on it but the banner pencil (own profile), then a row with the 88 px circular picture and
 * the name and nickname beside it (#765: nothing overlaps the banner). Edit profile › Name uses the
 * same hero as a live preview (placement="preview"). Put it first in a p-4 Card.
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
  return (
    <Wrapper
      aria-label={preview ? 'Profile card preview' : undefined}
      className={cn('flex min-w-0 flex-col gap-3.5', className)}
    >
      <div className={profileHeroBannerVariants({ placement })}>
        <ProfileBanner
          bannerKey={bannerKey}
          imageUrl={bannerImageUrl}
          className="aspect-[5/2] w-full"
        />
        {onChangeBanner ? (
          <button
            type="button"
            aria-label="Change banner"
            title="Change banner"
            onClick={onChangeBanner}
            className={cn(PENCIL, 'top-2.5 right-2.5')}
          >
            <Icon name="edit" className="size-4" />
          </button>
        ) : null}
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
          {onChangePicture ? (
            <button
              type="button"
              aria-label="Change profile picture"
              title="Change profile picture"
              onClick={onChangePicture}
              className={cn(PENCIL, '-right-1.5 -bottom-1.5')}
            >
              <Icon name="edit" className="size-4" />
            </button>
          ) : null}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          {preview ? (
            <b className="text-[20px] font-extrabold [overflow-wrap:anywhere]">{name}</b>
          ) : (
            <h1 className="[overflow-wrap:anywhere]">{name}</h1>
          )}
          {nickname ? <p className="m-0 text-fg2 [overflow-wrap:anywhere]">“{nickname}”</p> : null}
          {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
      </div>
      {children}
    </Wrapper>
  )
}
