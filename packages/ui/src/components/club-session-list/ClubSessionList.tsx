import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { DateBlock, formatSessionWhen } from '@rotra/ui/date-block'
import { EmptyState } from '@rotra/ui/empty-state'

export type ClubSessionRow = {
  id: string
  title: string
  startsAt: number
  endsAt: number
  live: boolean
  /** The session's public page */
  href: string
}

export type ClubSessionListProps = {
  /** Every upcoming session (scheduled and live, never cancelled), for the count */
  upcomingCount: number
  /** The upcoming sessions after the Next up card's, soonest first */
  rest: ClubSessionRow[]
}

/**
 * P-CLUB-PAGE › Upcoming sessions: the sessions after Next up, each with a date block and a status
 * chip, opening the session's public page.
 */
export function ClubSessionList({ upcomingCount, rest }: ClubSessionListProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2>Upcoming sessions</h2>
          <span className="text-sm text-fg2">{upcomingCount.toLocaleString('en-US')}</span>
        </div>
        {rest.length ? (
          <div>
            {rest.map((session) => (
              <a
                key={session.id}
                href={session.href}
                className="group flex min-w-0 items-center gap-3 py-2.5 text-inherit no-underline [&+&]:border-t [&+&]:border-border"
              >
                <DateBlock at={session.startsAt} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate group-hover:text-accent group-focus-visible:text-accent">
                    {session.title}
                  </b>
                  <span className="text-sm text-fg2">
                    {formatSessionWhen(session.startsAt, session.endsAt)}
                  </span>
                </span>
                <Chip tone={session.live ? 'accent' : 'solid'}>
                  {session.live ? 'Happening now' : 'Scheduled'}
                </Chip>
              </a>
            ))}
          </div>
        ) : upcomingCount ? (
          <p className="m-0 text-sm text-fg2">That's the only one scheduled so far.</p>
        ) : (
          <EmptyState>No upcoming sessions.</EmptyState>
        )}
      </section>
    </Card>
  )
}
