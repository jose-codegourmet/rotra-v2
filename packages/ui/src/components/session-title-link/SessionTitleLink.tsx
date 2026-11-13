import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type SessionTitleLinkProps = {
  /** The session title */
  title: string
  /** The session's public page (the club's preview, `/sessions/<id>/public-page`) */
  href: string
  className?: string
}

/**
 * The session title in every Queue page header (2026-11-13-queue-session-title-link; the prototype's
 * sessTitle): a link to the session's public page that opens in a new tab, with a small muted
 * external-link icon after it (accent and underline on hover). Long titles wrap with the icon at the
 * end. Put it inside the header's h1.
 */
export function SessionTitleLink({ title, href, className }: SessionTitleLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      title="Open the public page in a new tab"
      aria-label={`${title}. Open the public page in a new tab`}
      className={cn(
        'group text-inherit no-underline [overflow-wrap:anywhere] hover:underline hover:decoration-2 hover:underline-offset-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      {title}
      <span className="ml-2 inline-grid align-middle text-fg2 group-hover:text-accent">
        <Icon name="external" size={18} />
      </span>
    </a>
  )
}
