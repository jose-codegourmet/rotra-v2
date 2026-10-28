import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import {
  type PublicSessionHeroVariants,
  publicSessionHeroVariants,
} from './PublicSessionHero.variants'

export type PublicSessionHeroProps = {
  /** "Sun, Oct 26 · 6:00 PM–9:00 PM" (date · start–end), already formatted */
  dateLine: string
  title: string
  clubName: string
  /** The club's stored initials, e.g. "LS" */
  clubInitials: string
  clubLogoUrl?: string | null
  /** live = active (Happening now), finished = completed (Finished), upcoming = prepared (no chip) */
  state: NonNullable<PublicSessionHeroVariants['state']>
  className?: string
}

/**
 * The top of the public session page: the accent date line, the session title and the club (logo or
 * initials, name, "Organizer") with a "Happening now" or "Finished" chip. Shows no operator data.
 */
export function PublicSessionHero({
  dateLine,
  title,
  clubName,
  clubInitials,
  clubLogoUrl,
  state,
  className,
}: PublicSessionHeroProps) {
  return (
    <section
      aria-label="Session"
      data-state={state}
      className={cn(publicSessionHeroVariants({ state }), className)}
    >
      <span className="font-bold text-accent">{dateLine}</span>
      <h1 className="[overflow-wrap:anywhere]">{title}</h1>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          name={clubName}
          initials={clubInitials}
          src={clubLogoUrl ?? undefined}
          size={36}
          className={clubLogoUrl ? 'bg-surface' : undefined}
        />
        <div className="min-w-0 flex-1">
          <b className="block [overflow-wrap:anywhere]">{clubName}</b>
          <p className="m-0 text-[13px] text-fg2">Organizer</p>
        </div>
        {state === 'live' ? (
          <Chip tone="accent">Happening now</Chip>
        ) : state === 'finished' ? (
          <Chip tone="neutral">Finished</Chip>
        ) : null}
      </div>
    </section>
  )
}
