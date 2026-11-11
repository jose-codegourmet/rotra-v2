import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { DateBlock, formatSessionWhen } from '@rotra/ui/date-block'

export type ClubNextUpCardProps = {
  title: string
  startsAt: number
  endsAt: number
  /** Happening now: the courts are running */
  live: boolean
  /** The session's public page */
  href: string
}

/** P-CLUB-PAGE: the soonest session as a highlighted card (Next up, or Happening now). */
export function ClubNextUpCard({ title, startsAt, endsAt, live, href }: ClubNextUpCardProps) {
  return (
    <section
      aria-label="Next session"
      className={cn(
        'flex min-w-0 items-center gap-4 rounded-lg border bg-linear-135 from-accent-subtle to-transparent to-70% p-4 shadow-card max-[640px]:flex-wrap',
        live ? 'border-accent' : 'border-accent/45',
      )}
    >
      <DateBlock at={startsAt} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          {live ? 'Happening now' : 'Next up'}
        </span>
        <b className="text-lg [overflow-wrap:anywhere]">{title}</b>
        <span className="text-sm text-fg2">
          {formatSessionWhen(startsAt, endsAt)}
          {live ? ' · courts are running' : ''}
        </span>
      </div>
      <Button variant="primary" size="sm" asChild className="max-[640px]:flex-[1_1_100%]">
        <a href={href}>{live ? 'Watch live' : 'Open session page'}</a>
      </Button>
    </section>
  )
}
