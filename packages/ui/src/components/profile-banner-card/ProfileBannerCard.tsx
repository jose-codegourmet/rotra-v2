import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { ProfileBanner } from '@rotra/ui/profile-banner'
import type { ReactNode } from 'react'

export type ProfileBannerCardProps = {
  /** The name as this viewer may see it (masked on the private and guest cards) */
  name: string
  /** Shown in quotes beside the name */
  nickname?: string | null
  photoUrl?: string
  /**
   * Opens the full photo (PhotoViewer, D-PHOTO-VIEWER, #716). With a photo, the big picture becomes
   * the Avatar view button named `photoLabel`; initials never open anything.
   */
  onPhotoClick?: () => void
  /** Accessible name of the photo button; defaults to “View full photo of NAME” */
  photoLabel?: string
  /** The player's Profile banner key (court, night, dusk, ember, sun, stripe); without it or an image, the accent gradient */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** The chip row: identity chip, level badge, Private profile or Not on ROTRA yet */
  chips?: ReactNode
  /** The small muted identity line under the chips (Queue Master's card) */
  identityLine?: ReactNode
  /** The Tonight · line; hidden when null or missing (not on tonight's roster) */
  tonight?: ParticipantTonight | null
  /** Boxed sections (ProfileCardSection) and anything that follows them */
  children?: ReactNode
  className?: string
}

/** “Playing · Court 2”, “On court · getting ready · Court 1”, “Queued · #3”, “Free”, “Away” */
export function tonightText(tonight: ParticipantTonight) {
  switch (tonight.kind) {
    case 'playing':
      return `Playing · ${tonight.courtLabel}`
    case 'getting-ready':
      return `On court · getting ready · ${tonight.courtLabel}`
    case 'queued':
      return `Queued · #${tonight.position}`
    case 'free':
      return 'Free'
    case 'away':
      return 'Away'
  }
}

const DOT: Record<ParticipantTonight['kind'], string> = {
  playing: 'bg-accent',
  'getting-ready': 'bg-warn',
  queued: 'bg-fg2',
  free: 'bg-fg2',
  away: 'bg-border-strong',
}

/** The level badge on the chip row: “Intermediate High”, “… tonight”, “… · suggestion”. */
export function ProfileLevelBadge({ children }: { children: ReactNode }) {
  return (
    <Chip tone="accent" className="text-fg">
      {children}
    </Chip>
  )
}

/** The banner card's boxed section: an uppercase label over its content (About, Stats, Private). */
export function ProfileCardSection({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-bg px-3.5 py-3',
        className,
      )}
    >
      <span className="text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">{label}</span>
      {children}
    </section>
  )
}

/** Stats · last 90 days as four tiles (Games, Wins, Losses, Win rate). */
export function ProfileStatTiles({ stats }: { stats: ParticipantStats }) {
  const tiles = [
    { label: 'Games', value: stats.games },
    { label: 'Wins', value: stats.wins },
    { label: 'Losses', value: stats.losses },
    { label: 'Win rate', value: `${stats.winRate}%` },
  ]
  return (
    <dl className="m-0 grid grid-cols-2 gap-2">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg border border-border bg-surface px-3 py-2.5">
          <dt className="text-xs font-semibold text-fg2">{tile.label}</dt>
          <dd className="m-0 mt-0.5 text-[20px] font-extrabold tabular-nums">{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The profile card (D-PARTICIPANT-PROFILE): a banner strip (the player's Profile banner, else the accent gradient), the big picture
 * overlapping its bottom edge with a surface-coloured ring, the name in bold with the nickname in
 * quotes, the chip row, an optional identity line, the Tonight · status line, then boxed sections.
 * Shared by the session page's participant cards and the Queue Master's player profile. Put it in a
 * Sheet with `bodyClassName="p-0"` so the banner runs edge to edge.
 */
export function ProfileBannerCard({
  name,
  nickname,
  photoUrl,
  onPhotoClick,
  photoLabel,
  bannerKey,
  bannerImageUrl,
  chips,
  identityLine,
  tonight,
  children,
  className,
}: ProfileBannerCardProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {bannerKey || bannerImageUrl ? (
        <ProfileBanner bannerKey={bannerKey} imageUrl={bannerImageUrl} className="h-[84px]" />
      ) : (
        <div
          aria-hidden
          className="h-[84px] bg-[linear-gradient(135deg,var(--accent-dim),var(--accent)_55%,var(--accent-subtle))]"
        />
      )}
      <div className="absolute top-[44px] left-5">
        <Avatar
          name={name}
          src={photoUrl}
          size={64}
          className="shadow-[0_0_0_5px_var(--surface)]"
          onView={onPhotoClick}
          viewLabel={photoLabel}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-5 pt-[52px] pb-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2">
          <b className="text-[20px] font-extrabold tracking-[-0.2px] [overflow-wrap:anywhere]">
            {name}
          </b>
          {nickname ? (
            <span className="text-fg2 [overflow-wrap:anywhere]">“{nickname}”</span>
          ) : null}
        </div>
        {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
        {identityLine ? <span className="text-[13px] text-fg2">{identityLine}</span> : null}
        {tonight ? (
          <div
            className={cn(
              'inline-flex items-center gap-2 text-[13px] font-semibold text-fg2',
              tonight.kind === 'playing' && 'text-accent',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-2.5 flex-none rounded-full shadow-[0_0_0_3px_var(--surface),0_0_0_4px_var(--border-strong)]',
                DOT[tonight.kind],
              )}
            />
            Tonight · {tonightText(tonight)}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
