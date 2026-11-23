'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
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
  /** The full name: the screen-reader label and the hover text */
  name: string
  /** The player's own nickname; shown when there is no club nickname */
  nickname?: string | null
  /** The club nickname (registered players only); shown first */
  clubNickname?: string | null
  photoUrl?: string
  /** The level locked for this session; null when none was set. Shown as the picture's ring, not as text */
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
   * Set games played… (D-SET-GAMES): makes Current in the games strip a button (dashed underline,
   * hover tint, focus ring). Pressing it never selects the card; Total is not clickable.
   */
  onSetGames?: () => void
  /**
   * Edit player (D-EDIT-LIVE-PLAYER): a ghost pencil button at the card's top right named
   * “Edit NAME”. Pressing it never selects the card.
   */
  onEdit?: () => void
  /**
   * No show (cancelled): a ghost button in error colour on the card's last row. Pass it only for a
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

const RING = {
  beginner: '[--ring:var(--lv-beg)]',
  intermediate: '[--ring:var(--lv-int)]',
  advanced: '[--ring:var(--lv-adv)]',
  none: '[--ring:var(--lv-none)]',
} as const

/**
 * One player in the live Players view (the prototype's .pc3): a role=button card with the picture in
 * a level-band ring, one name (club nickname, nickname, full name; two lines at most), the
 * Current | Total games strip, wait time, status and the Present switch. Tapping, Enter or Space
 * toggles selection; selected cards show their pick order in a badge. No Move to waitlist: the
 * session is already running.
 */
export function PlayerPoolCard({
  name,
  nickname,
  clubNickname,
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
  onEdit,
  onNoShow,
  onOpenProfile,
  className,
}: PlayerPoolCardProps) {
  const shownName = clubNickname?.trim() || nickname?.trim() || name
  const band = level ? (level.split('_')[0] as keyof typeof RING) : 'none'
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
      className={cn(playerPoolCardVariants({ state }), RING[band], className)}
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
        {/* The ring is the level band; hovering the picture names the level. */}
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
              title={levelLabel(level)}
              onClick={onOpenProfile}
              className={cn(
                'outline-[3px] outline-offset-2 outline-(--ring)',
                state === 'away' && 'opacity-55 grayscale',
              )}
            />
          </span>
        ) : (
          <span className="flex-none" title={levelLabel(level)}>
            <Avatar
              name={name}
              src={photoUrl}
              size={40}
              className={cn(
                'outline-[3px] outline-offset-2 outline-(--ring)',
                state === 'away' && 'opacity-55 grayscale',
              )}
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {/* One name; the full name is the hover text and the card's screen-reader label keeps it. */}
          <div
            title={name}
            className="line-clamp-2 overflow-hidden text-[13px] leading-tight font-bold [overflow-wrap:anywhere]"
          >
            {shownName}
          </div>
        </div>
        {onEdit ? (
          // The pencil sits inside the card: stop its clicks and keys from selecting the card.
          // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
          <span
            className="flex-none self-start"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              size="xs"
              variant="ghost"
              aria-label={`Edit ${name}`}
              title="Edit player"
              onClick={onEdit}
            >
              <Icon name="edit" size={16} />
            </Button>
          </span>
        ) : null}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout */}
      <div
        role="group"
        className="grid grid-cols-[1fr_1px_1fr] items-stretch overflow-hidden rounded-md border border-border-strong bg-bg"
        aria-label={`${games} games played, ${forTheNight} for the night${presenceCaption ? `, ${presenceCaption}` : ''}`}
      >
        {onSetGames ? (
          // The button sits inside the card: stop its clicks and keys from reaching the card's selection.
          // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
          <span
            className="flex min-w-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              title="Games played so far"
              aria-label={`${games} games played. Set games played for ${name}`}
              onClick={onSetGames}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-px border-0 bg-transparent px-1 py-1.5 text-inherit transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <b className="text-lg leading-[1.1] font-extrabold tabular-nums">{games}</b>
              <span className="text-[10px] font-semibold tracking-[0.4px] text-fg2 uppercase underline decoration-dashed underline-offset-[3px]">
                Current
              </span>
            </button>
          </span>
        ) : (
          <div
            title="Games played so far"
            className="flex min-w-0 flex-col items-center gap-px px-1 py-1.5"
          >
            <b className="text-lg leading-[1.1] font-extrabold tabular-nums">{games}</b>
            <span className="text-[10px] font-semibold tracking-[0.4px] text-fg2 uppercase">
              Current
            </span>
          </div>
        )}
        <i aria-hidden className="my-1.5 bg-border-strong" />
        <div
          title="Played plus queued for the night"
          className="flex min-w-0 flex-col items-center gap-px px-1 py-1.5"
        >
          <b className="text-lg leading-[1.1] font-extrabold text-accent tabular-nums">
            {forTheNight}
          </b>
          <span className="text-[10px] font-semibold tracking-[0.4px] text-fg2 uppercase">
            Total
          </span>
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
      {onNoShow ? (
        // The button sits inside the card: stop its clicks and keys from reaching the card's selection.
        // biome-ignore lint/a11y/noStaticElementInteractions: a plain stop-propagation boundary around the button
        <span
          className="flex flex-wrap items-center gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            size="xs"
            variant="ghost"
            className="text-error"
            aria-label={`Mark ${name} as No show (cancelled)`}
            onClick={onNoShow}
          >
            No show (cancelled)
          </Button>
        </span>
      ) : null}
      {/* biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout */}
    </div>
  )
}
