import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'

export type CancelledRecordRosterPlayer = {
  id: string
  name: string
  photoUrl?: string
  /** "Intermediate Mid"; "No level" when none was set */
  levelLabel: string
  /** "Paid ₱150" or "Not paid" */
  paidLabel: string
}

export type CancelledRecordRosterProps = {
  roster: CancelledRecordRosterPlayer[]
  /** Names in the order they joined the waitlist; the section is hidden when empty */
  waitlist: { id: string; name: string }[]
  className?: string
}

/**
 * The read-only roster and waitlist of a cancelled session's record (Q-HISTORY, cancelled form):
 * "Roster · N" as player cards with level and Paid / Not paid, then "Waitlist · N" as a numbered
 * list. Nobody joined: "Nobody had joined."
 */
export function CancelledRecordRoster({ roster, waitlist, className }: CancelledRecordRosterProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <section aria-label="Roster" className="flex flex-col gap-3">
        <h2>Roster · {roster.length}</h2>
        {roster.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3 p-0">
            {roster.map((p) => (
              <li key={p.id}>
                <Card className="flex min-w-0 items-center gap-3">
                  <Avatar name={p.name} src={p.photoUrl} size={36} />
                  <div className="min-w-0">
                    <b className="block [overflow-wrap:anywhere]">{p.name}</b>
                    <p className="m-0 text-[13px] text-fg2">
                      {p.levelLabel} · {p.paidLabel}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nobody had joined." />
        )}
      </section>
      {waitlist.length ? (
        <section aria-label="Waitlist" className="flex flex-col gap-3">
          <h2>Waitlist · {waitlist.length}</h2>
          <ol className="m-0 flex flex-col gap-1 pl-6 text-[14px]">
            {waitlist.map((w) => (
              <li key={w.id}>{w.name}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
