'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
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
  /** Games played plus queued matches. */
  forTheNight: number
  selfCheckedInAt?: number | null
  leftAt?: number | null
  /** Minutes since the player's last game ended (or since they became present). Shown for available players only */
  waitMinutes?: number
  status: PlayerPoolCardStatus
  present: boolean
  /** Transient intent has not been accepted yet; the switch stays interactive. */
  presencePending?: boolean
  /** Picked for the next match; `pickOrder` is 1-based and shows as the badge */
  selected?: boolean
  pickOrder?: number
  /** Tap, Enter or Space on the card */
  onToggleSelect: () => void
  /** The Present switch; toggling it never changes the selection */
  onPresentChange: (present: boolean) => void
  /**
   * Set games played… (#717, D-SET-GAMES): shows a small ghost pencil button at the card's top right.
   * Tapping it never selects the card.
   */
  onSetGames?: () => void
  /**
   * Move to waitlist (#735): a secondary button on the card's last row. Tapping it never selects
   * the card. The container blocks it with a toast while the player is in a match.
   */
  onStepDown?: () => void
  /**
   * No show (cancelled): a ghost button in error colour next to Move to waitlist. Pass it only for a
   * live player who is away, has played no games and is in no match; it opens the confirmation.
   */
  onNoShow?: () => void
  /**
   * Opens the player's profile (D-PARTICIPANT-PROFILE): the picture becomes a button named
   * “View NAME's profile”. Tapping it never selects the card.
   */
  onOpenProfile?: () => void
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
 * locked level, played and for-the-night totals, wait time, status and the Present switch. Tapping, Enter
 * or Space toggles selection; selected cards show their pick order in a badge.
 */
export function PlayerPoolCard({
  name,
  photoUrl,
  level,
  games,
  forTheNight,
  selfCheckedInAt,
  leftAt,
  waitMinutes,
  status,
  present,
  presencePending = false,
  selected = false,
  pickOrder,
  onToggleSelect,
  onPresentChange,
  onSetGames,
  onStepDown,
  onNoShow,
  onOpenProfile,
  className,
}: PlayerPoolCardProps) {
  const state = status.kind === 'playing' ? 'playing' : present ? 'available' : 'away'
  const presenceCaption =
    present && selfCheckedInAt != null
      ? `Checked in themselves · ${new Date(selfCheckedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : !present && leftAt != null
        ? `Left · ${new Date(leftAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : undefined
  const showWait = state === 'available' && waitMinutes !== undefined
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggleSelect()
    }
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: the card holds block layout a native button cannot
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${name}, ${levelLabel(level)}, ${games} games played, ${forTheNight} for the night${presenceCaption ? `, ${presenceCaption}` : ''}`}
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
        {onOpenProfile ? (
          // The picture button sits inside the card: stop its clicks and keys from selecting the card.
          // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
          <span
            className="flex-none"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Avatar
              name={name}
              src={photoUrl}
              size={40}
              onClick={onOpenProfile}
              className={cn(state === 'away' && 'opacity-55 grayscale')}
            />
          </span>
        ) : (
          <Avatar
            name={name}
            src={photoUrl}
            size={40}
            className={cn(state === 'away' && 'opacity-55 grayscale')}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-tight font-bold [overflow-wrap:anywhere]">{name}</div>
          <div className="text-[11px] leading-[1.3] text-fg2">{levelLabel(level)}</div>
        </div>
        {onSetGames ? (
          // The button sits inside the card: stop its clicks and keys from reaching the card's selection.
          // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
          <span
            className="flex-none"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <IconButton
              variant="ghost"
              size="xs"
              label={`Set games played… ${name}`}
              title="Set games played…"
              onClick={onSetGames}
            >
              <Icon name="edit" size={16} />
            </IconButton>
          </span>
        ) : null}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout */}
      <div
        role="group"
        className="grid grid-cols-2 gap-2"
        aria-label={`${games} games played, ${forTheNight} for the night${presenceCaption ? `, ${presenceCaption}` : ''}`}
      >
        <div className="flex min-w-0 flex-col gap-0.5 rounded-md bg-bg px-2.5 py-2">
          <b className="text-2xl leading-none font-extrabold tabular-nums">{games}</b>
          <span className="text-[11px] text-fg2">played</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 rounded-md bg-accent-subtle px-2.5 py-2">
          <b className="text-2xl leading-none font-extrabold text-accent tabular-nums">
            {forTheNight}
          </b>
          <span className="text-[11px] text-fg2">for the night</span>
        </div>
      </div>
      <div className="flex flex-nowrap items-center justify-between gap-3">
        <span
          className={cn('text-[13px] text-fg2', state === 'playing' && 'font-semibold text-accent')}
        >
          {statusText(status)}
          {showWait ? ` · ${waitMinutes} min wait` : null}
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
      {present && selfCheckedInAt != null ? (
        <span className="inline-flex items-center gap-1 text-xs text-fg2">
          <Icon name="check" size={13} />
          Checked in themselves ·{' '}
          {new Date(selfCheckedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      ) : !present && leftAt != null ? (
        <span className="text-xs text-fg2">
          Left · {new Date(leftAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      ) : null}
      {presencePending ? <span className="text-[11px] text-fg2">Saving presence…</span> : null}
      {onStepDown || onNoShow ? (
        // The button sits inside the card: stop its clicks and keys from reaching the card's selection.
        // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
        <span
          className="flex flex-wrap items-center gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {onStepDown ? (
            <Button size="xs" aria-label={`Move ${name} to the waitlist`} onClick={onStepDown}>
              Move to waitlist
            </Button>
          ) : null}
          {onNoShow ? (
            <Button
              size="xs"
              variant="ghost"
              className="text-error"
              aria-label={`Mark ${name} as No show (cancelled)`}
              onClick={onNoShow}
            >
              No show (cancelled)
            </Button>
          ) : null}
        </span>
      ) : null}
      {/* biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout */}
    </div>
  )
}
