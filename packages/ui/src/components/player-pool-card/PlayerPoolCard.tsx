'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { levelLabel } from '@rotra/ui/level-pill'
import { Switch } from '@rotra/ui/switch'
import type { KeyboardEvent } from 'react'
import { playerPoolCardVariants } from './PlayerPoolCard.variants'

export type PlayerPoolCardStatus =
  /** On court: `courtLabel` is "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  | { kind: 'playing'; courtLabel: string }
  /** Not present */
  | { kind: 'away' }
  /** Present, off court, already in a waiting match at queue position `position` */
  | { kind: 'queued'; position: number }
  /** Present, off court, in no waiting match */
  | { kind: 'free' }

export type PlayerPoolCardProps = {
  name: string
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** The session's minimum games */
  minimumGames: number
  /** Minutes since the player's last game ended (or since they became present). Shown for available players only */
  waitMinutes?: number
  status: PlayerPoolCardStatus
  present: boolean
  /** Picked for the next match; `pickOrder` is 1-based and shows as the badge */
  selected?: boolean
  pickOrder?: number
  /** Tap, Enter or Space on the card */
  onToggleSelect: () => void
  /** The Present switch; toggling it never changes the selection */
  onPresentChange: (present: boolean) => void
  className?: string
}

function statusText(status: PlayerPoolCardStatus) {
  switch (status.kind) {
    case 'playing':
      return `On ${status.courtLabel}`
    case 'away':
      return 'Away'
    case 'queued':
      return `Queued · #${status.position}`
    case 'free':
      return 'Free'
  }
}

/**
 * One player in the live Players view (the prototype's .pc3): a role=button card with picture, name,
 * locked level, games against the minimum, wait time, status and the Present switch. Tapping, Enter
 * or Space toggles selection; selected cards show their pick order in a badge.
 */
export function PlayerPoolCard({
  name,
  photoUrl,
  level,
  games,
  minimumGames,
  waitMinutes,
  status,
  present,
  selected = false,
  pickOrder,
  onToggleSelect,
  onPresentChange,
  className,
}: PlayerPoolCardProps) {
  const state = status.kind === 'playing' ? 'playing' : present ? 'available' : 'away'
  const showWait = state === 'available' && waitMinutes !== undefined
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggleSelect()
    }
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: the card holds a Switch, so it cannot be a <button>
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${name}, ${levelLabel(level)}, ${games} games`}
      onClick={onToggleSelect}
      onKeyDown={onKeyDown}
      className={cn(playerPoolCardVariants({ state }), className)}
    >
      {selected && pickOrder !== undefined ? (
        <span
          aria-hidden
          className="absolute -top-1.5 -left-1.5 grid size-[22px] place-items-center rounded-full bg-accent text-[11px] font-extrabold text-on-accent"
        >
          {pickOrder}
        </span>
      ) : null}
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          name={name}
          src={photoUrl}
          size={40}
          className={cn(state === 'away' && 'opacity-55 grayscale')}
        />
        <div className="min-w-0">
          <div className="text-[13px] leading-tight font-bold [overflow-wrap:anywhere]">{name}</div>
          <div className="text-[11px] leading-[1.3] text-fg2">{levelLabel(level)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 text-[11px]">
        <span className="rounded-md bg-bg px-1.5 py-0.5 tabular-nums">
          {games}/{minimumGames} games
        </span>
        {showWait ? (
          <span className="rounded-md bg-bg px-1.5 py-0.5 tabular-nums">
            {waitMinutes} min wait
          </span>
        ) : null}
      </div>
      <div className="flex flex-nowrap items-center justify-between gap-3">
        <span
          className={cn('text-[13px] text-fg2', state === 'playing' && 'font-semibold text-accent')}
        >
          {statusText(status)}
        </span>
        {/* The switch sits inside the card: stop its clicks and keys from reaching the card's selection. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the Switch */}
        <span
          className="flex-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Switch
            checked={present}
            onChange={onPresentChange}
            aria-label={`${name} present`}
            className="origin-right scale-80 touch:scale-100"
          />
        </span>
      </div>
    </article>
  )
}
