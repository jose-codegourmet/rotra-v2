import { cn } from '@rotra/ui/cn'
import { type ClubLogoVariants, clubLogoVariants } from './ClubLogo.variants'

export type ClubLogoProps = ClubLogoVariants & {
  /** The club's stored initials ("LS") */
  initials: string
  /** Logo picture; initials show when missing */
  logoUrl?: string | null
  className?: string
}

/** A club's logo, or its initials on a rounded square. Decorative: the name always sits beside it. */
export function ClubLogo({ initials, logoUrl, size, tone, className }: ClubLogoProps) {
  return (
    <span aria-hidden className={cn(clubLogoVariants({ size, tone }), className)}>
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : initials}
    </span>
  )
}
