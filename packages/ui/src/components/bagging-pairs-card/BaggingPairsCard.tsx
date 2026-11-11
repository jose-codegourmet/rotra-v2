'use client'

import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { BaggingGamesRow } from '@rotra/ui/bagging-games-row'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'

/** A present roster player as the bagging surfaces draw them. */
export type BaggingPlayer = {
  /** Roster (SessionPlayer) id */
  id: string
  /** Full name: the selection slots and accessible names */
  name: string
  /** Nickname or first name: the grid tiles and the pair rows */
  shortName: string
  level: PlayingLevel | null
  /** "Intermediate Mid", for the accessible name; the ring colour is the level band */
  levelLabel?: string | null
  photoUrl?: string
}
export type BaggingPairView = {
  id: string
  a: BaggingPlayer
  b: BaggingPlayer
  games: BaggingGames
}

export type BaggingPairsCardProps = {
  pairs: BaggingPairView[]
  minimumGames: number
  onAddPair: () => void
  /** A tap on the row's games row; the caller applies toggleBaggingGame */
  onToggleGame: (pairId: string, value: 'all' | number) => void
  onRemove: (pairId: string) => void
  disabled?: boolean
  className?: string
}

/**
 * The prototypes' Bagging pairs card under the Generate matches header while Bagging mode is on:
 * title with the count, the helper line, Add pair, and one row per pair with its games row and
 * Remove (#739, D-2026-11-11-11).
 */
export function BaggingPairsCard({
  pairs,
  minimumGames,
  onAddPair,
  onToggleGame,
  onRemove,
  disabled,
  className,
}: BaggingPairsCardProps) {
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="Bagging pairs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h3 className="m-0 text-base font-bold text-fg">
            Bagging pairs{pairs.length ? ` · ${pairs.length}` : ''}
          </h3>
          <Button size="sm" variant="primary" disabled={disabled} onClick={onAddPair}>
            Add pair
          </Button>
        </div>
        <p className="m-0 text-[13px] text-fg2">
          Pairs guide Generate matches. Auto Queue and matches you build by hand are not affected.
        </p>
        {pairs.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pairs.map((pair) => {
              const names = `${pair.a.shortName} and ${pair.b.shortName}`
              return (
                <li
                  key={pair.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-bg px-3 py-2.5"
                >
                  <span className="flex flex-none">
                    <Avatar name={pair.a.name} src={pair.a.photoUrl} size={28} />
                    <Avatar
                      name={pair.b.name}
                      src={pair.b.photoUrl}
                      size={28}
                      className="-ml-1.5 shadow-[0_0_0_2px_var(--bg)]"
                    />
                  </span>
                  <b className="min-w-0 flex-1 text-fg [overflow-wrap:anywhere]">{names}</b>
                  <BaggingGamesRow
                    games={pair.games}
                    minimumGames={minimumGames}
                    disabled={disabled}
                    aria-label={`Games for ${names}`}
                    onToggle={(value) => onToggleGame(pair.id, value)}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={disabled}
                    aria-label={`Remove pair ${names}`}
                    onClick={() => onRemove(pair.id)}
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="m-0 text-[13px] text-fg2">
            No pairs yet. Add a pair to keep two players as partners.
          </p>
        )}
      </section>
    </Card>
  )
}
