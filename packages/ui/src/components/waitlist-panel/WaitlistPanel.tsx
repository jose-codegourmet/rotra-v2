import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { levelLabel } from '@rotra/ui/level-pill'
import { Skeleton } from '@rotra/ui/skeleton'

/** One person on the first-come waitlist, in the order they joined */
export type WaitlistPanelEntry = {
  /** The waitlist entry's id, passed back through the callbacks */
  id: string
  name: string
  photoUrl?: string
  level: PlayingLevel | null
  /** Formatted time they joined, e.g. "6:12 PM" */
  waitingSinceLabel: string
}

export type WaitlistPanelProps = {
  entries: WaitlistPanelEntry[]
  rosterCount: number
  courtCount: number
  playersPerCourt: number
  /** The waitlist is still loading: Skeleton rows in place of the list and the slots line */
  loading?: boolean
  onFillOpenSlots: () => void
  onGiveSlot: (entryId: string) => void
  onRemove: (entryId: string) => void
  onOpenProfile: (entryId: string) => void
  className?: string
}

/**
 * The first-come waitlist shared by preparation and the live Players view: slots used against the
 * budget, Fill N open slots, and one row per waiting player with Give slot and remove. While loading
 * it shows the heading and Skeleton rows.
 */
export function WaitlistPanel({
  entries,
  rosterCount,
  courtCount,
  playersPerCourt,
  loading = false,
  onFillOpenSlots,
  onGiveSlot,
  onRemove,
  onOpenProfile,
  className,
}: WaitlistPanelProps) {
  const capacity = courtCount * playersPerCourt
  const open = Math.max(0, capacity - rosterCount)
  const fill = Math.min(open, entries.length)
  if (loading)
    return (
      <Card asChild className={cn('flex flex-col gap-3', className)}>
        <section aria-busy aria-label="Loading the waitlist">
          <div>
            <h2 className="text-lg font-bold">Waitlist</h2>
            <Skeleton className="mt-1.5 w-64" />
          </div>
          <div className="flex flex-col divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="w-6" />
                <Skeleton className="size-10 rounded-full" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="w-36" />
                  <Skeleton className="h-3 w-48" />
                </span>
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </Card>
    )
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Waitlist{entries.length ? ` · ${entries.length}` : ''}
            </h2>
            <p className="text-[13px] text-fg2">
              Slots:{' '}
              <b className="text-fg">
                {rosterCount} of {capacity}
              </b>{' '}
              used ({courtCount} court{courtCount === 1 ? '' : 's'} × {playersPerCourt} players)
              {open ? ` · ${open} open` : ' · full'}. First come, first served.
            </p>
          </div>
          {fill ? (
            <Button size="sm" variant="primary" onClick={onFillOpenSlots}>
              Fill {fill} open slot{fill > 1 ? 's' : ''}
            </Button>
          ) : null}
        </div>
        {entries.length ? (
          <div className="flex flex-col divide-y divide-border">
            {entries.map((w, i) => (
              <div key={w.id} className="flex min-w-0 items-center gap-3 py-3">
                <span className="font-mono font-bold">#{i + 1}</span>
                <Avatar name={w.name} src={w.photoUrl} onClick={() => onOpenProfile(w.id)} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <b className="font-semibold [overflow-wrap:anywhere]">{w.name}</b>
                  <p className="text-[13px] text-fg2">
                    {levelLabel(w.level)} · waiting since {w.waitingSinceLabel}
                  </p>
                </div>
                <Button
                  size="xs"
                  variant={open ? 'primary' : 'secondary'}
                  title={open ? undefined : 'Over your slot budget'}
                  onClick={() => onGiveSlot(w.id)}
                >
                  {open ? 'Give slot' : 'Give slot anyway'}
                </Button>
                <IconButton
                  size="xs"
                  variant="ghost"
                  label={`Remove ${w.name} from the waitlist`}
                  onClick={() => onRemove(w.id)}
                >
                  <Icon name="x" />
                </IconButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-fg2">
            {open
              ? 'Nobody is waiting.'
              : 'Nobody is waiting. Players added from now on join the waitlist.'}
          </p>
        )}
      </section>
    </Card>
  )
}
