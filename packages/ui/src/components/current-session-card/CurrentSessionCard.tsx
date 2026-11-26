import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { EmptyState } from '@rotra/ui/empty-state'
import { type ElementType, useId } from 'react'

export type CurrentSessionCardProps = {
  /** The session the player is in that is happening now; omit for the empty state */
  session?: {
    title: string
    /** Day, time and club, e.g. "Today · 7:00 PM · Cebu Smashers" */
    subtitle: string
    /** The session page */
    href: string
  }
  /** Link component for the session href; apps pass next/link's Link. */
  linkAs?: ElementType
}

/**
 * P-HOME: the highlighted "Happening now" session the player is in, with Open session page, or
 * a plain card saying no session is running.
 */
export function CurrentSessionCard({ session, linkAs: Link = 'a' }: CurrentSessionCardProps) {
  const headingId = useId()
  if (!session) {
    return (
      <Card asChild>
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <h2 id={headingId}>Current session</h2>
          <EmptyState>
            No session right now. When a session you're in starts, it shows here.
          </EmptyState>
        </section>
      </Card>
    )
  }
  return (
    <Card asChild tone="highlight">
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId}>Current session</h2>
          <Chip tone="accent">Happening now</Chip>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <b className="text-xl [overflow-wrap:anywhere]">{session.title}</b>
            <span className="text-[13px] text-fg2">{session.subtitle}</span>
          </div>
          <Button asChild variant="primary">
            <Link href={session.href} className="no-underline">
              Open session page
            </Link>
          </Button>
        </div>
      </section>
    </Card>
  )
}
