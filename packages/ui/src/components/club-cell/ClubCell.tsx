import { Chip } from '@rotra/ui/chip'
import { ClubLogo } from '@rotra/ui/club-logo'
import type { ElementType } from 'react'

export type ClubCellProps = {
  name: string
  initials: string
  logoUrl?: string | null
  /** The prototype's highlighted logo (Lahug Smash Club) */
  accent?: boolean
  /** The club account's sign-in username, e.g. "lahug.smash" */
  username: string
  /** Title of the Queue Session running now, if any */
  runningSessionTitle?: string | null
  /** A club name change request is waiting for review */
  hasNameRequest?: boolean
  /** Club detail URL; the name renders as a link */
  href?: string
  /** Link element for href (e.g. Next's Link); defaults to <a> */
  linkComponent?: ElementType
  /** Used when there is no href; the name renders as a button */
  onOpen?: () => void
}

const nameClass =
  'w-fit border-0 bg-transparent p-0 text-left font-bold text-fg [overflow-wrap:anywhere] hover:underline hover:underline-offset-3'

/**
 * The Club cell of an Admin directory row: logo, club name (opens the club), username, the running
 * session and a pending name change request.
 */
export function ClubCell({
  name,
  initials,
  logoUrl,
  accent,
  username,
  runningSessionTitle,
  hasNameRequest,
  href,
  linkComponent: Link = 'a',
  onOpen,
}: ClubCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ClubLogo initials={initials} logoUrl={logoUrl} tone={accent ? 'accent' : 'default'} />
      <div className="flex min-w-0 flex-col gap-px">
        {href ? (
          <Link href={href} className={nameClass}>
            {name}
          </Link>
        ) : onOpen ? (
          <button type="button" onClick={onOpen} className={nameClass}>
            {name}
          </button>
        ) : (
          <span className="font-bold text-fg [overflow-wrap:anywhere]">{name}</span>
        )}
        <span className="font-mono text-xs text-fg2 [overflow-wrap:anywhere]">{username}</span>
        {runningSessionTitle ? (
          <span className="inline-flex items-center gap-1.5 text-[13px]">
            <i
              aria-hidden
              className="size-2 flex-none rounded-full bg-accent animate-[pulse_1.6s_infinite] motion-reduce:animate-none"
            />
            <span className="[overflow-wrap:anywhere]">Running: {runningSessionTitle}</span>
          </span>
        ) : null}
        {hasNameRequest ? (
          <span>
            <Chip tone="warn">Name change requested</Chip>
          </span>
        ) : null}
      </div>
    </div>
  )
}
