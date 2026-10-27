import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import type { ElementType } from 'react'

export type BreadcrumbProps = {
  /** Where Back goes, e.g. "Home", "Back to session setup", "Clubs" */
  label: string
  href?: string
  onClick?: () => void
  /** Link component for href; defaults to <a> (pass next/link's Link in apps) */
  linkAs?: ElementType
}

/**
 * The prototypes' .crumb / .back: a small ghost "‹ Home" button above the page title that returns to
 * the parent screen.
 */
export function Breadcrumb({ label, href, onClick, linkAs: Link = 'a' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
      {href ? (
        <Button asChild variant="ghost" size="sm" className="-ml-2.5">
          <Link href={href} onClick={onClick}>
            <Icon name="back" />
            {label}
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="-ml-2.5" onClick={onClick}>
          <Icon name="back" />
          {label}
        </Button>
      )}
    </nav>
  )
}
