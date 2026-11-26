'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { levelLabel, levelRingClass } from '@rotra/ui/level-pill'
import { type ExemptionPlayer, PlayerPickerSheet } from '@rotra/ui/player-picker-sheet'
import { useId, useState } from 'react'

export type ExemptionListCardProps = {
  /** Every roster player: the picker's tiles and the chips' names */
  players: ExemptionPlayer[]
  /** The saved list, in the order it was saved */
  exemptIds: string[]
  /** "Save list · N" in the picker, or a chip's ×: the container stores the ids */
  onSave: (ids: string[]) => void
  disabled?: boolean
  className?: string
}

/**
 * The Exemption list card beside the Generate Queue controls (2026-11-19-queue-generate-exemption-list):
 * the players Generate Queue leaves out. "Exemption list · N", Choose players (primary while empty) or
 * Edit list, one chip per player (picture with the level ring, short name, ×), and the help line.
 * Choosing opens the Exemption list sheet. Presentational: the container keeps the list.
 */
export function ExemptionListCard({
  players,
  exemptIds,
  onSave,
  disabled,
  className,
}: ExemptionListCardProps) {
  const headingId = useId()
  const [open, setOpen] = useState(false)
  const listed = exemptIds.flatMap((id) => {
    const player = players.find((p) => p.id === id)
    return player ? [player] : []
  })
  const count = listed.length

  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-labelledby={headingId}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h3 id={headingId} className="m-0 text-base font-bold text-fg">
            Exemption list{count ? ` · ${count}` : ''}
          </h3>
          <Button
            size="sm"
            variant={count ? undefined : 'primary'}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {count ? 'Edit list' : 'Choose players'}
          </Button>
        </div>
        <p className="m-0 text-[13px] text-fg2">
          Generate Queue leaves these players out. They stay on the roster, and you can still put
          them in a match yourself.
        </p>
        {count ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {listed.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-bg py-[3px] pr-1 pl-[3px] text-[13px] text-fg"
              >
                <span
                  title={levelLabel(p.level)}
                  className={cn('inline-flex rounded-full', levelRingClass(p.level))}
                >
                  <Avatar
                    name={p.name}
                    src={p.photoUrl}
                    size={24}
                    className="outline-2 outline-offset-1 outline-(--ring)"
                  />
                </span>
                <b>{p.shortName}</b>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Take ${p.name} off the exemption list`}
                  title="Remove"
                  onClick={() =>
                    onSave(listed.filter((other) => other.id !== p.id).map((other) => other.id))
                  }
                >
                  <Icon name="x" size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border-strong bg-transparent p-3.5 text-left text-sm text-fg2',
              'hover:border-accent hover:text-fg disabled:cursor-not-allowed disabled:opacity-45',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-7 flex-none place-items-center rounded-full bg-accent-subtle text-lg font-extrabold text-accent"
            >
              +
            </span>
            No one is exempt. Choose players to leave out.
          </button>
        )}
        <PlayerPickerSheet
          variant="exemption"
          open={open}
          onOpenChange={setOpen}
          players={players}
          exemptIds={listed.map((p) => p.id)}
          onSave={onSave}
        />
      </section>
    </Card>
  )
}
