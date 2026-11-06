import type { MatchFormat, MatchOrigin, MatchStatus } from '@rotra/data/match/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { PlayerFaceButton, type PlayerWait } from '@rotra/ui/player-face-button'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'
import type { ComponentProps } from 'react'
import { matchCardVariants } from './MatchCard.variants'

/** One player on a queue card: picture and short name, full name and level for the label. */
export type MatchCardPlayer = {
  id: string
  name: string
  /** Nickname or first name, shown under the picture */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
  /**
   * Live session wait under the name ("M min", On court, Playing, Not here). Omit when the session
   * is not live; the console computes the minutes (Q12.22).
   */
  wait?: PlayerWait
}

export type MatchCardTeam = 'A' | 'B'

/** The flow arrow the queue grid draws after a card: right or left along the snake, down at a row end */
export type MatchCardFlow = 'right' | 'left' | 'down'

/** A small fact under a player's name on a draft: "3 played", "Playing now" (warn) */
export type MatchCardPlayerChip = { text: string; tone?: 'warn' }

/**
 * An Auto Queue draft: a "Draft" chip replaces #position, there is no handle or actions, and the
 * whole tile toggles selection like a Players tile (role="button", aria-pressed, Space / Enter).
 */
export type MatchCardDraft = {
  selected: boolean
  /** Pick order across all tabs, in the corner badge while selected */
  pickOrder?: number
  onToggle: () => void
  disabled?: boolean
  /** Chips under each player's name, by player id */
  playerChips?: Record<string, MatchCardPlayerChip[]>
}

export type MatchCardProps = {
  /** Queue position P, shown as "#P" */
  position: number
  /** Match number N, used in the handle and Remove labels */
  matchNo: number
  format: MatchFormat
  origin: MatchOrigin
  /** Manual matches (added, made or edited by the Queue Master) are protected from regeneration */
  manualProtected: boolean
  status: MatchStatus
  teamA: MatchCardPlayer[]
  teamB: MatchCardPlayer[]
  /** Flow arrow given by the grid; omit on the last card */
  flow?: MatchCardFlow | null
  /** Props the reorder behaviour attaches to the ⠿ handle (pointer and key handlers, data attributes) */
  handleProps?: Omit<ComponentProps<'button'>, 'aria-label' | 'children' | 'type'>
  /**
   * Switch sides: wraps each player in a SwappablePlayer (drag onto the other team, or ← / →).
   * Needs an enclosing SwapSidesArea, which reports the swap.
   */
  swappable?: boolean
  /** Opens the player's profile */
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
  /** Start: rendered only when given, enabled only when the match is ready */
  onStart?: () => void
  /**
   * The match only waits for a court and a court is not open yet: Start stays enabled, and the
   * Start match sheet offers Start anyway on that court.
   */
  canOpenCourt?: boolean
  /** Edit the lineup: rendered only when given */
  onEdit?: () => void
  /** Remove the waiting match: rendered only when given */
  onRemove?: () => void
  /** Renders the card as a selectable Auto Queue draft */
  draft?: MatchCardDraft
  className?: string
}

const FORMAT_LABEL: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

const FLOW_ARROW: Record<MatchCardFlow, string> = { right: '→', left: '←', down: '↓' }

function Faces({
  players,
  team,
  swappable,
  onSelectPlayer,
}: {
  players: MatchCardPlayer[]
  team: MatchCardTeam
  swappable: boolean
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
      {players.map((p, i) => {
        const face = (
          <PlayerFaceButton
            key={p.id}
            name={p.name}
            shortName={p.shortName}
            level={p.level}
            photoUrl={p.photoUrl}
            label={`${p.name}, Team ${team}. View profile`}
            size="queue"
            wait={p.wait}
            swap={swappable ? { team, index: i } : undefined}
            onClick={() => onSelectPlayer?.(p.id, team)}
          />
        )
        return swappable ? (
          <SwappablePlayer key={p.id} team={team} index={i}>
            {face}
          </SwappablePlayer>
        ) : (
          face
        )
      })}
    </div>
  )
}

/** A draft's faces: the same picture and name, not a profile button, with the player's chips under it. */
function DraftFaces({
  players,
  chips,
}: {
  players: MatchCardPlayer[]
  chips?: Record<string, MatchCardPlayerChip[]>
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
      {players.map((p) => (
        <div key={p.id} className="flex min-w-0 flex-col items-center gap-px" title={p.name}>
          <Avatar
            name={p.name}
            src={p.photoUrl}
            size={44}
            className="touch:size-[46px] touch:text-[15px]"
          />
          <span className="max-w-[88px] truncate text-[15px] font-semibold text-fg">
            {p.shortName}
          </span>
          {chips?.[p.id]?.length ? (
            <span className="flex max-w-24 flex-wrap justify-center gap-0.5">
              {chips[p.id]?.map((chip) => (
                <span
                  key={chip.text}
                  className={cn(
                    'rounded-md px-[5px] text-[10px] leading-[1.4] whitespace-nowrap',
                    chip.tone === 'warn' ? 'bg-warn-subtle text-warn' : 'bg-bg text-fg2',
                  )}
                >
                  {chip.text}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

const teamNames = (players: MatchCardPlayer[]) => players.map((p) => p.shortName).join(' and ')

/**
 * The prototype's .qtile: one waiting match in the shared queue and in the Session view's upcoming
 * row. Head with position, format, origin, flow arrow and drag handle; Team A, VS, Team B; a status
 * line that is always icon + text; Start, Edit and Remove. With `draft`, the same tile is an Auto
 * Queue draft that toggles selection.
 */
export function MatchCard({
  position,
  matchNo,
  format,
  origin,
  manualProtected,
  status,
  teamA,
  teamB,
  flow,
  handleProps,
  swappable = false,
  onSelectPlayer,
  onStart,
  canOpenCourt = false,
  onEdit,
  onRemove,
  draft,
  className,
}: MatchCardProps) {
  const ready = status.kind === 'ready'
  const startable = ready || (canOpenCourt && status.kind === 'waiting-for-courts')
  const attention = status.kind === 'needs-attention'
  const { className: handleClassName, ...handleRest } = handleProps ?? {}
  const statusLine = (
    <span
      className={cn(
        'flex items-start gap-1.5 text-xs',
        ready ? 'text-accent' : attention ? 'text-warn' : 'text-fg2',
      )}
    >
      <Icon
        name={ready ? 'check' : attention ? 'alert' : 'info'}
        className={cn('mt-0.5 flex-none', attention && 'animate-pulse motion-reduce:animate-none')}
      />
      <span className="line-clamp-2">{status.reason}</span>
    </span>
  )

  if (draft) {
    const toggle = () => {
      if (!draft.disabled) draft.onToggle()
    }
    return (
      // biome-ignore lint/a11y/useSemanticElements: the tile holds pictures, chips and a status line, so it cannot be a <button>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={draft.selected}
        aria-disabled={draft.disabled || undefined}
        aria-label={`Draft ${FORMAT_LABEL[format]}: ${teamNames(teamA)} vs ${teamNames(teamB)}${draft.selected && draft.pickOrder ? `, picked ${draft.pickOrder}` : ''}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
          e.preventDefault()
          toggle()
        }}
        className={cn(
          matchCardVariants({
            status: status.kind,
            draft: draft.selected ? 'selected' : 'idle',
          }),
          draft.disabled && 'cursor-not-allowed opacity-70',
          className,
        )}
      >
        {draft.selected && draft.pickOrder !== undefined ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -left-1.5 grid size-[22px] place-items-center rounded-full bg-accent text-[11px] font-extrabold text-on-accent"
          >
            {draft.pickOrder}
          </span>
        ) : null}
        <div className="flex min-w-0 items-center gap-1.5">
          <Chip>Draft</Chip>
          <Chip tone="solid">{FORMAT_LABEL[format]}</Chip>
        </div>
        <DraftFaces players={teamA} chips={draft.playerChips} />
        <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
        <DraftFaces players={teamB} chips={draft.playerChips} />
        {statusLine}
      </div>
    )
  }

  return (
    <article
      aria-label={`Queue position ${position}`}
      className={cn(matchCardVariants({ status: status.kind }), className)}
    >
      <div className="flex min-w-0 items-center gap-1.5 touch:-mt-1.5 touch:-mr-1.5">
        <span className="font-mono font-bold">#{position}</span>
        <Chip tone="solid">{FORMAT_LABEL[format]}</Chip>
        {manualProtected ? (
          <span className="inline-flex text-fg2" title="Manual · protected from regeneration">
            <Icon name="lock" aria-label="Manual · protected from regeneration" role="img" />
          </span>
        ) : (
          <span className="text-[13px] text-fg2">
            {origin === 'suggested' ? 'Suggested' : origin === 'auto' ? 'Auto' : 'Manual'}
          </span>
        )}
        <span className="flex-1" />
        {flow ? (
          <span aria-hidden className="font-extrabold text-fg3">
            {FLOW_ARROW[flow]}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Reorder match ${matchNo}: drag, or use the arrow keys`}
          title="Drag to reorder"
          {...handleRest}
          className={cn(
            'cursor-grab touch-none rounded-sm border-0 bg-transparent px-1.5 py-1 text-lg leading-none text-fg2',
            'hover:bg-elev hover:text-fg active:cursor-grabbing',
            'touch:min-h-11 touch:min-w-11 touch:p-0 touch:text-[22px]',
            handleClassName,
          )}
        >
          ⠿
        </button>
      </div>
      <Faces players={teamA} team="A" swappable={swappable} onSelectPlayer={onSelectPlayer} />
      <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
      <Faces players={teamB} team="B" swappable={swappable} onSelectPlayer={onSelectPlayer} />
      {statusLine}
      {onStart || onEdit || onRemove ? (
        <div className="flex flex-nowrap items-center gap-1 touch:gap-1.5">
          {onStart ? (
            <Button
              size="xs"
              variant={ready ? 'primary' : 'secondary'}
              disabled={!startable}
              onClick={onStart}
              className="touch:flex-1"
            >
              Start
            </Button>
          ) : null}
          {onEdit ? (
            <Button size="xs" onClick={onEdit} className="touch:flex-1">
              Edit
            </Button>
          ) : null}
          <span className="flex-1" />
          {onRemove ? (
            <IconButton
              size="xs"
              variant="ghost"
              label={`Remove waiting match ${matchNo}`}
              title="Remove"
              onClick={onRemove}
            >
              <Icon name="x" />
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
