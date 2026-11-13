'use client'

import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ProfileBanner } from '@rotra/ui/profile-banner'
import { Skeleton } from '@rotra/ui/skeleton'
import { StatsFire } from '@rotra/ui/stats-fire'
import { toast } from '@rotra/ui/toaster'
import { type MouseEvent, type ReactNode, useRef } from 'react'

/** Where the icon right of the name (and Open ROTRA profile) goes. */
export type ProfileCardLink = {
  /** The ROTRA profile: `/find/<RTR>` from Queue and Admin, `/players/<id>` inside Player */
  href: string
  /**
   * true (Queue, Admin: another app): opens in a new tab, with the new-tab icon. false (inside the
   * Player app): same tab, a forward arrow; pass onNavigate to route in the app.
   */
  newTab: boolean
  /** Same-tab only: in-app navigation instead of a full page load (the card closes) */
  onNavigate?: () => void
}

export type ProfileBannerCardProps = {
  /** The full name as this viewer may see it (masked on the private and guest cards) */
  name: string
  /**
   * With a nickname the card leads with it (the display name) and puts the full name under it in
   * muted 14 px; without one the full name leads alone.
   */
  nickname?: string | null
  /** A muted line under the name when there is no nickname (the club card's city or username) */
  subline?: ReactNode
  /** The RTR ID: the tiny monospace Copy button under the name. None for guests and unclaimed records */
  rtrId?: string | null
  /** “RTR ID” (Queue, Admin) or “player ID” (Player): the Copy button's name and toast */
  idLabel?: 'RTR ID' | 'player ID'
  /** The icon right of the display name that opens the ROTRA profile; none when missing */
  profileLink?: ProfileCardLink | null
  photoUrl?: string
  /**
   * Opens the full photo (PhotoViewer, D-PHOTO-VIEWER, #716). With a photo, the big picture becomes
   * the Avatar view button named `photoLabel`, with the eye on hover and focus; initials never open
   * anything.
   */
  onPhotoClick?: () => void
  /** Accessible name of the photo button; defaults to “View full photo of NAME” */
  photoLabel?: string
  /** Replaces the picture (the club card's round logo); give it the 5 px `--surface` ring yourself */
  picture?: ReactNode
  /** Picture size: 64 px (Queue and Player cards) or 72 px (Admin Quick view) */
  pictureSize?: 64 | 72
  /** The resolved Profile banner key (court, night, …); unknown or missing draws Court */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** The chip row: identity chip, level badge, Private profile or Not on ROTRA yet */
  chips?: ReactNode
  /** The small muted identity line under the chips (Queue Master's card) */
  identityLine?: ReactNode
  /**
   * The status pill on the picture's bottom edge. Pass it only while the session is live: none on a
   * prepared session, after Session done, or off the roster.
   */
  tonight?: ParticipantTonight | null
  /** Boxed sections (ProfileCardSection) and anything that follows them */
  children?: ReactNode
  className?: string
}

/** The pill's tooltip and accessible name: “Tonight · Playing · Court 2”, “Tonight · Free · waiting 12 min”. */
export function tonightText(tonight: ParticipantTonight) {
  switch (tonight.kind) {
    case 'playing':
      return `Tonight · Playing · ${tonight.courtLabel}`
    case 'getting-ready':
      return `Tonight · On court · getting ready · ${tonight.courtLabel}`
    case 'queued':
      return `Tonight · Queued · #${tonight.position}`
    case 'free':
      return tonight.restMinutes === undefined
        ? 'Tonight · Free'
        : `Tonight · Free · waiting ${tonight.restMinutes} min`
    case 'away':
      return 'Tonight · Away'
  }
}

/** The pill's short label: Playing in Court N, Waiting in Court N, Queued #N, Free · N min, Away. */
export function tonightPillLabel(tonight: ParticipantTonight) {
  switch (tonight.kind) {
    case 'playing':
      return `Playing in ${tonight.courtLabel}`
    case 'getting-ready':
      return `Waiting in ${tonight.courtLabel}`
    case 'queued':
      return `Queued #${tonight.position}`
    case 'free':
      return tonight.restMinutes === undefined ? 'Free' : `Free · ${tonight.restMinutes} min`
    case 'away':
      return 'Away'
  }
}

const ACCENT =
  'border-[color-mix(in_srgb,var(--accent)_45%,var(--border-strong))] text-accent [&>i]:bg-accent'
const WARN =
  'border-[color-mix(in_srgb,var(--warn)_45%,var(--border-strong))] text-warn [&>i]:bg-warn'
const ERROR =
  'border-[color-mix(in_srgb,var(--error)_45%,var(--border-strong))] text-error [&>i]:bg-error'

/** Live pills use the accent, getting ready the warning colour; Free is coloured like the queue tiles' wait. */
function pillTone(tonight: ParticipantTonight) {
  switch (tonight.kind) {
    case 'playing':
      return ACCENT
    case 'getting-ready':
      return WARN
    case 'free': {
      const mins = tonight.restMinutes
      if (mins === undefined) return '[&>i]:bg-fg2'
      return mins >= 16 ? ERROR : mins >= 10 ? WARN : ACCENT
    }
    case 'away':
      return '[&>i]:bg-border-strong'
    default:
      return '[&>i]:bg-fg2'
  }
}

/** The status pill centred on the picture's bottom edge; hover or focus shows the full line to its right. */
function StatusPill({ tonight }: { tonight: ParticipantTonight }) {
  const tip = tonightText(tonight)
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so keyboard users get the tooltip (the prototype's .pp-pill)
    <span
      role="note"
      tabIndex={0}
      aria-label={tip}
      className={cn(
        'group/pill absolute -bottom-2.5 left-1/2 z-2 inline-flex -translate-x-1/2 cursor-default items-center gap-[5px] rounded-full border border-border-strong bg-surface py-0.5 pr-2 pl-1.5',
        'text-[11px] leading-4 font-bold whitespace-nowrap text-fg2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        pillTone(tonight),
      )}
    >
      <i aria-hidden className="size-2 flex-none rounded-full" />
      {tonightPillLabel(tonight)}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 left-[calc(100%+8px)] -translate-y-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-xs font-semibold text-bg shadow-sheet',
          'opacity-0 transition-opacity duration-[120ms] group-hover/pill:opacity-100 group-focus-visible/pill:opacity-100 motion-reduce:transition-none',
        )}
      >
        {tip}
      </span>
    </span>
  )
}

/**
 * The tiny monospace Copy button under the name: “Copy RTR ID <id>” → toast “RTR ID copied”
 * (Queue, Admin), “Copy player ID <id>” → “Player ID copied” (Player). When the clipboard is refused
 * the ID is selected instead: “ID selected. Copy it from your device menu.”
 */
export function ProfileIdCopyButton({
  rtrId,
  idLabel = 'RTR ID',
}: {
  rtrId: string
  idLabel?: 'RTR ID' | 'player ID'
}) {
  const textRef = useRef<HTMLSpanElement>(null)
  const copied = idLabel === 'RTR ID' ? 'RTR ID copied' : 'Player ID copied'
  const fallback = () => {
    const node = textRef.current
    const selection = typeof window !== 'undefined' ? window.getSelection() : null
    if (node && selection) {
      const range = document.createRange()
      range.selectNodeContents(node)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    toast('ID selected. Copy it from your device menu.')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rtrId)
      toast(copied)
    } catch {
      fallback()
    }
  }
  return (
    <Button
      size="xs"
      onClick={() => void copy()}
      aria-label={`Copy ${idLabel} ${rtrId}`}
      title={`Copy ${idLabel}`}
      className="mt-1 h-[22px] min-h-[22px] gap-1 rounded-md px-1.5 font-mono text-[11px] font-medium tracking-[0.2px] text-fg2 hover:text-fg touch:min-h-[22px] touch:px-1.5 touch:text-[11px]"
    >
      <span ref={textRef}>{rtrId}</span>
      <Icon name="copy" size={12} />
    </Button>
  )
}

/** The icon right of the display name: new tab (Queue, Admin) or a forward arrow (inside Player). */
function NameLink({ link, displayName }: { link: ProfileCardLink; displayName: string }) {
  const className =
    'inline-grid size-7 flex-none place-items-center rounded-lg text-fg2 no-underline hover:bg-elev hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  if (link.newTab)
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${displayName}'s ROTRA profile in a new tab`}
        title="Open ROTRA profile in a new tab"
        className={className}
      >
        <Icon name="external" size={16} />
      </a>
    )
  return (
    <a
      href={link.href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!link.onNavigate || event.metaKey || event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        link.onNavigate()
      }}
      aria-label={`Open ${displayName}'s ROTRA profile`}
      title="Open ROTRA profile"
      className={className}
    >
      <Icon name="forward" size={16} />
    </a>
  )
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

/** “Latest stats” with the year as a small outlined chip on the right (tooltip on the chip). */
function LatestStatsHead({ year }: { year: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">Latest stats</span>
      <span
        title={`Counts ${year} so far; starts again on January 1`}
        className="rounded-full border border-border-strong px-2 py-px text-[11px] font-bold text-fg2 tabular-nums"
      >
        {year}
      </span>
    </div>
  )
}

/**
 * Latest stats with games (2026-11-13-profile-stats-redesign): a box on the podium's look (an 8 px
 * accent grid at 7% over the surface, a soft accent glow from the bottom left, an accent-tinted
 * border) split 30 / 70. Left: “Win rate” over the percentage in 32 px accent with the pixel fire
 * beside it (above it, capped at 40 px, under 420 px). Right: “Latest stats” and the year chip,
 * then Games, Wins, Losses as plain counters with hairline dividers.
 */
export function ProfileLatestStats({ year, stats }: { year: number; stats: ParticipantStats }) {
  const counters = [
    { label: 'Games', value: stats.games },
    { label: 'Wins', value: stats.wins },
    { label: 'Losses', value: stats.losses },
  ]
  return (
    <section
      aria-label="Latest stats"
      className={cn(
        'relative grid min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,7fr)] overflow-hidden rounded-lg border px-4 py-3.5',
        'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]',
        'bg-[radial-gradient(120%_90%_at_0%_100%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_65%),repeating-linear-gradient(0deg,color-mix(in_srgb,var(--accent)_7%,transparent)_0_1px,transparent_1px_8px),repeating-linear-gradient(90deg,color-mix(in_srgb,var(--accent)_7%,transparent)_0_1px,transparent_1px_8px),var(--surface)]',
      )}
    >
      <div className="flex flex-col justify-between gap-2 border-r border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] pr-4 max-[420px]:pr-3">
        <span className="text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">Win rate</span>
        <div
          role="img"
          aria-label={`Win rate ${stats.winRate}%`}
          className="flex min-h-[30px] items-end gap-1 max-[420px]:flex-col-reverse max-[420px]:items-start max-[420px]:gap-0.5"
        >
          <span className="text-[32px] leading-[0.9] font-extrabold tracking-[-0.5px] text-accent tabular-nums max-[420px]:text-2xl">
            {stats.winRate}%
          </span>
          <StatsFire rate={stats.winRate} className="max-[420px]:max-h-10 max-[420px]:max-w-[33px]" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 pl-4 max-[420px]:pl-3">
        <LatestStatsHead year={year} />
        <dl className="m-0 grid grid-cols-3 gap-2">
          {counters.map((counter) => (
            <div
              key={counter.label}
              className="border-l border-border py-0.5 pl-3.5 first:border-l-0 first:pl-0 max-[420px]:pl-2.5"
            >
              <dt className="text-[10px] font-bold tracking-[0.5px] text-fg2 uppercase">
                {counter.label}
              </dt>
              <dd className="m-0 mt-1.5 text-[22px] leading-none font-extrabold tabular-nums max-[420px]:text-[19px]">
                {counter.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/**
 * The one stats block of every profile card (Queue cards, Player card, Admin Quick view): Latest
 * stats, the current calendar year, reset on January 1 (2026-11-13-profile-stats-redesign). With
 * games, the win rate and its pixel fire beside Games, Wins and Losses on the podium grid; else
 * “No games yet this year”.
 */
export function ProfileStatsSection({
  year,
  stats,
  loading = false,
  error = false,
}: {
  /** The calendar year counted (statsYear from @rotra/data/player/rules), on the year chip */
  year: number
  /** null is “No games yet this year” */
  stats: ParticipantStats | null
  loading?: boolean
  /** The read failed: says so instead of “No games yet this year” */
  error?: boolean
}) {
  if (!loading && !error && stats && stats.games > 0)
    return <ProfileLatestStats year={year} stats={stats} />
  return (
    <section
      aria-label="Latest stats"
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-bg px-3.5 py-3"
    >
      <LatestStatsHead year={year} />
      {loading ? (
        <Skeleton label="Loading stats" className="h-[72px] rounded-lg" />
      ) : error ? (
        <p className="m-0 text-fg2">Couldn't load these stats. Try again later.</p>
      ) : (
        <p className="m-0 text-fg2">No games yet this year</p>
      )}
    </section>
  )
}

/** Games and wins to the Latest stats numbers (win rate a whole percent); null without games. */
export function profileStats(games: number, wins: number): ParticipantStats | null {
  if (!games) return null
  return { games, wins, losses: games - wins, winRate: Math.round((wins / games) * 100) }
}

/**
 * The profile card (D-PARTICIPANT-PROFILE, D-CLUB-PROFILE, Admin Quick view): no title bar; the
 * banner's top half as a 5:1 strip from the card's top edge, the round picture centred on its
 * bottom edge (with the status pill while live), then the name block (display name with the profile
 * icon, the full name under it when there is a nickname, the tiny Copy RTR ID button), the chip row,
 * an optional identity line and boxed sections. Put it in a `headerless` Sheet so the banner runs to
 * the top edge and the × floats on it.
 */
export function ProfileBannerCard({
  name,
  nickname,
  subline,
  rtrId,
  idLabel = 'RTR ID',
  profileLink,
  photoUrl,
  onPhotoClick,
  photoLabel,
  picture,
  pictureSize = 64,
  bannerKey,
  bannerImageUrl,
  chips,
  identityLine,
  tonight,
  children,
  className,
}: ProfileBannerCardProps) {
  const displayName = nickname || name
  const second = nickname ? name : subline
  return (
    <div className={cn('relative min-w-0', className)}>
      <ProfileBanner strip bannerKey={bannerKey} imageUrl={bannerImageUrl} />
      <div
        className={cn(
          'relative z-1 ml-5 w-max',
          pictureSize === 72 ? '-mt-9' : '-mt-8',
        )}
      >
        {picture ?? (
          <Avatar
            name={name}
            src={photoUrl}
            size={64}
            className={cn(
              'shadow-[0_0_0_5px_var(--surface)]',
              pictureSize === 72 && 'size-[72px] text-[22px]',
            )}
            onView={onPhotoClick}
            viewLabel={photoLabel}
            viewEye
          />
        )}
        {tonight ? <StatusPill tonight={tonight} /> : null}
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-col gap-3 px-5 pb-5',
          tonight ? 'pt-5' : pictureSize === 72 ? 'pt-2.5' : 'pt-3',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
            <b className="text-[20px] font-extrabold tracking-[-0.2px] [overflow-wrap:anywhere]">
              {displayName}
            </b>
            {profileLink ? <NameLink link={profileLink} displayName={displayName} /> : null}
          </span>
          {second ? (
            <span className="text-sm text-fg2 [overflow-wrap:anywhere]">{second}</span>
          ) : null}
          {rtrId ? <ProfileIdCopyButton rtrId={rtrId} idLabel={idLabel} /> : null}
        </div>
        {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
        {identityLine ? <span className="text-[13px] text-fg2">{identityLine}</span> : null}
        {children}
      </div>
    </div>
  )
}
