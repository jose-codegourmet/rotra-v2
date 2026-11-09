import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { EmptyState } from '@rotra/ui/empty-state'
import { ListRow } from '@rotra/ui/list-row'
export type MySessionRow = {
  id: string
  title: string
  subtitle: string
  href: string
  status: 'live' | 'confirmed' | 'waitlist' | 'requested'
  waitlistPosition?: number
}
export type FinishedSessionRow = { id: string; title: string; subtitle: string; published: boolean }
export type MySessionsCardProps = {
  sessions: MySessionRow[]
  finished?: FinishedSessionRow[]
  onShareResult?: (id: string) => void
}
export function MySessionsCard({ sessions, finished = [], onShareResult }: MySessionsCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>My sessions</h2>
        {sessions.length ? (
          <div>
            {sessions.map((session) => (
              <a
                key={session.id}
                href={session.href}
                className="block rounded-md text-inherit no-underline hover:bg-elev"
              >
                <ListRow
                  title={session.title}
                  subtitle={session.subtitle}
                  trailing={
                    <Chip
                      tone={
                        session.status === 'live'
                          ? 'accent'
                          : session.status === 'confirmed'
                            ? 'solid'
                            : 'warn'
                      }
                    >
                      {session.status === 'live'
                        ? 'Happening now'
                        : session.status === 'confirmed'
                          ? 'Confirmed'
                          : session.status === 'waitlist'
                            ? `Waitlist #${session.waitlistPosition}`
                            : 'Requested'}
                    </Chip>
                  }
                />
              </a>
            ))}
          </div>
        ) : (
          <EmptyState>
            No upcoming sessions. Sessions you join from a club's session link show here.
          </EmptyState>
        )}
        {finished.length ? (
          <>
            <span className="text-xs font-semibold text-fg2 uppercase">Finished</span>
            <div>
              {finished.map((session) => (
                <ListRow
                  key={session.id}
                  title={session.title}
                  subtitle={session.subtitle}
                  trailing={
                    session.published ? (
                      onShareResult ? (
                        <Button size="xs" onClick={() => onShareResult(session.id)}>
                          Share result
                        </Button>
                      ) : null
                    ) : (
                      <span className="max-w-36 text-xs text-fg2">
                        Results not shared yet by the club.
                      </span>
                    )
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </Card>
  )
}
