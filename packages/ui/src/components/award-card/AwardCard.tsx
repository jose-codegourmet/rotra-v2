import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { PixelFire } from '@rotra/ui/pixel-fire'

export type AwardCardStanding = { position: number; of: number; wins: number; losses: number }

export type AwardCardProps = {
  /** `mvp`: accent pill with a trophy, 96 px face with an accent ring and the pixel fire; `improved`: grey pill, 88 px face; `off`: a small row card */
  tone: 'mvp' | 'improved' | 'off'
  /** “MVP”, “Most Improved”; Off Day cards have no pill */
  label?: string
  /** Per the page's masking rule */
  name: string
  pictureUrl?: string | null
  /** “#N of M · W won · L lost”; none without a counted game */
  standing?: AwardCardStanding | null
  reason: string
  /** Opens the profile card (signed-in players); without it the face is plain */
  onOpenFace?: () => void
  /** Share: “Share MVP: NAME”; Off Day cards get the icon only */
  onShare: () => void
  className?: string
}

/**
 * One award on the finished session page's Awards section (2026-11-13-queue-awards-faces-share,
 * passes 2–6; the prototype's pubAwards card, `.aw-card`): the award as a pill on top, a big face,
 * the name, the standing line, the reason and a full-width Share. MVP burns the pixel fire behind
 * the face (a still frame with reduced motion). Off Day is a small row card with a share icon.
 */
export function AwardCard({
  tone,
  label,
  name,
  pictureUrl,
  standing,
  reason,
  onOpenFace,
  onShare,
  className,
}: AwardCardProps) {
  const mvp = tone === 'mvp'
  const off = tone === 'off'
  const shareName = `Share ${label ?? 'Off Day'}: ${name}`
  const avatar = (
    <Avatar
      name={name}
      src={pictureUrl ?? undefined}
      size={88}
      className={cn(
        off
          ? 'size-11 text-[15px]'
          : mvp
            ? 'size-24 text-[30px] shadow-[0_0_0_3px_var(--surface),0_0_0_6px_var(--accent),0_0_28px_4px_color-mix(in_srgb,var(--accent)_35%,transparent)]'
            : 'size-[88px] text-[28px] shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--border-strong)]',
      )}
    />
  )
  const face = onOpenFace ? (
    <button
      type="button"
      onClick={onOpenFace}
      aria-label={`${name}. View profile`}
      className="relative z-1 flex-none cursor-pointer rounded-full border-0 bg-transparent p-0 leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {avatar}
    </button>
  ) : (
    <span className="relative z-1 flex-none leading-none">{avatar}</span>
  )
  const standingLine = standing ? (
    <span className={cn('text-[13px] text-fg2', mvp && '[&_b]:text-accent')}>
      <b className="text-fg">#{standing.position}</b> of {standing.of} ·{' '}
      <b className="text-fg">{standing.wins}</b> won · {standing.losses} lost
    </span>
  ) : null

  if (off)
    return (
      <article
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-card',
          className,
        )}
      >
        {face}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-[15px] leading-[1.2] [overflow-wrap:anywhere]">{name}</b>
          {standingLine}
          <span className="text-[13px] text-fg2">{reason}</span>
        </div>
        <IconButton size="sm" label={shareName} onClick={onShare}>
          <Icon name="share" />
        </IconButton>
      </article>
    )

  return (
    <article
      className={cn(
        'relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-lg border bg-surface px-[18px] pt-[22px] pb-[18px] text-center shadow-card',
        mvp
          ? 'border-accent/55 [background-image:radial-gradient(120%_80%_at_50%_0%,var(--accent-subtle),transparent_70%)]'
          : 'border-border',
        className,
      )}
    >
      {label ? (
        <span
          className={cn(
            'relative z-1 inline-flex items-center gap-1.5 rounded-full px-3 py-[3px] text-xs font-extrabold tracking-[0.6px] uppercase',
            mvp ? 'bg-accent text-on-accent' : 'bg-elev text-fg2',
          )}
        >
          {mvp ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-[13px]"
            >
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
            </svg>
          ) : null}
          {label}
        </span>
      ) : null}
      {mvp ? (
        <div className="relative -mt-2.5 grid place-items-center pt-[18px]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[30px] left-1/2 z-0 h-[151px] w-40 -translate-x-1/2 [&_canvas]:static [&_canvas]:size-full [&_canvas]:transform-none"
          >
            <PixelFire />
          </span>
          {face}
        </div>
      ) : (
        face
      )}
      <div className="relative z-1 flex flex-col items-center gap-1">
        <b className="text-[20px] leading-[1.2] font-extrabold [overflow-wrap:anywhere]">{name}</b>
        {standingLine}
        <span className="text-[13px] text-fg2">{reason}</span>
      </div>
      <Button
        className="relative z-1 mt-auto self-stretch"
        aria-label={shareName}
        onClick={onShare}
      >
        <Icon name="share" />
        Share
      </Button>
    </article>
  )
}
