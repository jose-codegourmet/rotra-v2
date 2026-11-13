import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'

/** One player taken off tonight's roster as No show (cancelled) */
export type NoShowPanelEntry = {
  /** Passed back through the callbacks */
  id: string
  name: string
  photoUrl?: string
  /** When they were marked, already formatted: "9:12 PM" */
  markedLabel: string
}

export type NoShowPanelProps = {
  entries: NoShowPanelEntry[]
  /** Every slot is taken: Back to roster is disabled with "The roster is full" */
  full: boolean
  onBackToRoster: (id: string) => void
  onOpenProfile: (id: string) => void
  /** A Back to roster is saving */
  isPending?: boolean
  className?: string
}

/**
 * The live Players view's No show (cancelled) card (the prototype's noShowPanel), above the
 * waitlist: "No show (cancelled) · N", each player's face, name and "Marked TIME" with Back to
 * roster (disabled while the roster is full). Renders nothing with no entries.
 */
export function NoShowPanel({
  entries,
  full,
  onBackToRoster,
  onOpenProfile,
  isPending = false,
  className,
}: NoShowPanelProps) {
  if (!entries.length) return null
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="No show (cancelled)">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">No show (cancelled) · {entries.length}</h3>
          <span className="text-[13px] text-fg2">Not on tonight's roster</span>
        </div>
        <div className="flex flex-col">
          {entries.map((x) => (
            <div key={x.id} className="flex min-w-0 items-center gap-3 py-1.5">
              <Avatar name={x.name} src={x.photoUrl} onClick={() => onOpenProfile(x.id)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <b className="font-semibold [overflow-wrap:anywhere]">{x.name}</b>
                <span className="text-[13px] text-fg2">Marked {x.markedLabel}</span>
              </div>
              <Button
                size="xs"
                disabled={full || isPending}
                title={full ? 'The roster is full' : undefined}
                onClick={() => onBackToRoster(x.id)}
              >
                Back to roster
              </Button>
            </div>
          ))}
        </div>
        {full ? (
          <p className="text-[13px] text-fg2">
            The roster is full. Free a slot to bring someone back.
          </p>
        ) : null}
      </section>
    </Card>
  )
}
