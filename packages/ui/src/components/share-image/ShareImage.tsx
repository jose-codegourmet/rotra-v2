import { ClubLogo } from '@rotra/ui/club-logo'
import { cn } from '@rotra/ui/cn'
import { RotraLogo } from '@rotra/ui/rotra-logo'
import type { ShareFormat } from '@rotra/ui/share-card/helpers'
import type { ReactNode } from 'react'

/** A round avatar or logo spot: the picture when there is one, otherwise the initials. */
export type ShareImageSpot = { initials: string; imageUrl?: string | null }

export type ShareImageProps = {
  /** Story 270 × 480, Facebook post 320 × 400, Square 320 × 320 (drawn 1080 px wide) */
  format: ShareFormat
  /** Bold first line beside the spot (the player's or club's name) */
  headline: string
  /** Muted line under the headline (nickname, club, ROTRA ID) */
  subline?: string
  /** Avatar or logo beside the headline; its picture is drawn into the PNG as `spot` */
  spot: ShareImageSpot
  /** The middle of the image. Mark every text node with data-qr-text so the PNG draws it. */
  children: ReactNode
  /** Right side of the footer, beside the ROTRA logo (Queue leaderboard: “#1–8 of 24”) */
  footerEnd?: ReactNode
  /** Accessible name of the image */
  label?: string
  className?: string
}

const SIZE: Record<ShareFormat, string> = {
  story: 'h-[480px] w-[270px]',
  post: 'h-[400px] w-[320px]',
  square: 'h-[320px] w-[320px]',
}

/**
 * One share image on the fixed dark brand card (the prototypes' .sh-card / .qs-card): the spot and
 * headline on top, the content, and the ROTRA logo at the foot. No grid, no QR, no tagline (owner,
 * November 13, 2026). Shown at full size; ShareImagePicker draws it into a 1080 px wide PNG.
 */
export function ShareImage({
  format,
  headline,
  subline,
  spot,
  children,
  footerEnd,
  label = 'Share image preview',
  className,
}: ShareImageProps) {
  return (
    <section
      aria-label={label}
      data-share-image={format}
      className={cn(
        'box-border flex shrink-0 flex-col gap-3 overflow-hidden rounded-[20px] bg-share-bg p-5 text-left text-share-fg [background-image:radial-gradient(120%_70%_at_50%_0%,var(--share-glow),transparent_60%)]',
        SIZE[format],
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          data-qr-logo="spot"
          className="size-13 shrink-0 overflow-hidden rounded-full bg-share-accent text-share-bg"
        >
          <ClubLogo
            initials={spot.imageUrl ? '' : spot.initials}
            logoUrl={spot.imageUrl ?? null}
            className="size-full rounded-full border-0 bg-transparent text-[18px] font-extrabold text-share-bg"
          />
        </span>
        <div className="min-w-0">
          <b data-qr-text className="block text-[16px] leading-[1.2] [overflow-wrap:anywhere]">
            {headline}
          </b>
          {subline ? (
            <span data-qr-text className="text-[12px] text-share-muted">
              {subline}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">{children}</div>
      <div className="flex items-end justify-between gap-3 text-[11px] text-share-muted">
        <RotraLogo tone="dark" className="h-5" />
        {footerEnd ? <span data-qr-text>{footerEnd}</span> : null}
      </div>
    </section>
  )
}
