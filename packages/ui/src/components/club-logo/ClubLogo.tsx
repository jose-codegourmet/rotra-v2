import { cn } from '@rotra/ui/cn'
import { type ClubLogoVariants, clubLogoVariants } from './ClubLogo.variants'

export type ClubLogoProps = ClubLogoVariants & {
  /** The club's stored initials ("LS") */
  initials: string
  /** Logo picture; initials show when missing */
  logoUrl?: string | null
  /**
   * Opens the full logo (PhotoViewer, #716). Only a real logo picture becomes a button named
   * `viewLabel`; initials stay inert. Leave it out when the logo sits inside another control.
   */
  onView?: () => void
  /** Accessible name of the view button, e.g. "View full logo of Lakeside Smashers" */
  viewLabel?: string
  className?: string
}

/** A club's logo, or its initials on a rounded square. Decorative: the name always sits beside it. */
export function ClubLogo({
  initials,
  logoUrl,
  size,
  tone,
  onView,
  viewLabel,
  className,
}: ClubLogoProps) {
  const logo = (
    <span aria-hidden className={cn(clubLogoVariants({ size, tone }), className)}>
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : initials}
    </span>
  )
  if (!logoUrl || !onView) return logo
  return (
    <button
      type="button"
      onClick={onView}
      aria-label={viewLabel ?? 'View full logo'}
      className={cn(
        'm-0 inline-flex flex-none cursor-zoom-in border-0 bg-transparent p-0 leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        size === 'lg' ? 'rounded-[14px]' : 'rounded-[10px]',
      )}
    >
      {logo}
    </button>
  )
}
