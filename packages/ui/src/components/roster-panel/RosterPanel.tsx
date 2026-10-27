import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { Notice } from '@rotra/ui/notice'
import { RosterRow } from '@rotra/ui/roster-row'
import { SlotMeter } from '@rotra/ui/slot-meter'

/** One roster slot with the saved-player details a RosterRow needs */
export type RosterPanelPlayer = {
  /** The session player's id, passed back through the callbacks */
  id: string
  name: string
  photoUrl?: string
  identity: Identity
  suggestion: PlayingLevel | null
  level: PlayingLevel | null
  present: boolean
}

export type RosterPanelProps = {
  players: RosterPanelPlayer[]
  /** Slot budget: courts × players per court */
  capacity: number
  waitlistCount?: number
  /** Levels lock when the session starts */
  levelsLocked?: boolean
  onMarkAllPresent: () => void
  onMarkAllAbsent: () => void
  onAddPlayer: () => void
  onOpenProfile: (playerId: string) => void
  onLevelChange: (playerId: string, level: PlayingLevel) => void
  onPresentChange: (playerId: string, present: boolean) => void
  onRemove: (playerId: string) => void
  className?: string
}

/**
 * The preparation "Roster and levels" panel: heading and actions, the SlotMeter, the missing-level
 * warning, one RosterRow per confirmed slot, or the empty line when nobody has a slot yet.
 */
export function RosterPanel({
  players,
  capacity,
  waitlistCount,
  levelsLocked,
  onMarkAllPresent,
  onMarkAllAbsent,
  onAddPlayer,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  className,
}: RosterPanelProps) {
  const missing = players.filter((p) => p.level === null).length
  const someoneAbsent = players.some((p) => !p.present)
  const someonePresent = players.some((p) => p.present)
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Roster and levels</h2>
            <p className="text-[13px] text-fg2">
              Confirm each player's slot and set their level for this club. Levels lock when the
              session starts.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {someoneAbsent ? (
              <Button size="sm" onClick={onMarkAllPresent} className="w-full sm:w-auto">
                Mark all present
              </Button>
            ) : null}
            {someonePresent ? (
              <Button size="sm" onClick={onMarkAllAbsent} className="w-full sm:w-auto">
                Mark all absent
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              onClick={onAddPlayer}
              // The prototype's .acts: an odd last button spans both phone columns
              className={cn('w-full sm:w-auto', someoneAbsent === someonePresent && 'col-span-2')}
            >
              Add player
            </Button>
          </div>
        </div>
        <SlotMeter rosterCount={players.length} capacity={capacity} waitlistCount={waitlistCount} />
        {missing ? (
          <Notice tone="warn">
            {missing} player{missing > 1 ? 's need' : ' needs'} a level before the session can start.
          </Notice>
        ) : null}
        {players.length ? (
          <div className="flex flex-col divide-y divide-border">
            {players.map((p) => (
              <RosterRow
                key={p.id}
                name={p.name}
                photoUrl={p.photoUrl}
                identity={p.identity}
                suggestion={p.suggestion}
                level={p.level}
                present={p.present}
                levelLocked={levelsLocked}
                onOpenProfile={() => onOpenProfile(p.id)}
                onLevelChange={(level) => onLevelChange(p.id, level)}
                onPresentChange={(present) => onPresentChange(p.id, present)}
                onRemove={() => onRemove(p.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState>No players yet. Add players from your saved list or as new guests.</EmptyState>
        )}
      </section>
    </Card>
  )
}
