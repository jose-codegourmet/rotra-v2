import type { MatchFormat, MatchOrigin, MatchStatus } from '@rotra/data/match/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { PlayerFaceButton } from '@rotra/ui/player-face-button'
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
}

export type MatchCardTeam = 'A' | 'B'

/** The flow arrow the queue grid draws after a card: right or left along the snake, down at a row end */
export type MatchCardFlow = 'right' | 'left' | 'down'

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
  /** Opens the player's profile */
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
  /** Start: rendered only when given, enabled only when the match is ready */
  onStart?: () => void
  /** Edit the lineup: rendered only when given */
  onEdit?: () => void
  /** Remove the waiting match: rendered only when given */
  onRemove?: () => void
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
  onSelectPlayer,
}: {
  players: MatchCardPlayer[]
  team: MatchCardTeam
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
      {players.map((p) => (
        <PlayerFaceButton
          key={p.id}
          name={p.name}
          shortName={p.shortName}
          level={p.level}
          photoUrl={p.photoUrl}
          label={`${p.name}, Team ${team}. View profile`}
          size="queue"
          onClick={() => onSelectPlayer?.(p.id, team)}
        />
      ))}
    </div>
  )
}

/**
 * The prototype's .qtile: one waiting match in the shared queue and in the Session view's upcoming
 * row. Head with position, format, origin, flow arrow and drag handle; Team A, VS, Team B; a status
 * line that is always icon + text; Start, Edit and Remove.
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
  onSelectPlayer,
  onStart,
  onEdit,
  onRemove,
  className,
}: MatchCardProps) {
  const ready = status.kind === 'ready'
  const attention = status.kind === 'needs-attention'
  const { className: handleClassName, ...handleRest } = handleProps ?? {}
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
      <Faces players={teamA} team="A" onSelectPlayer={onSelectPlayer} />
      <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
      <Faces players={teamB} team="B" onSelectPlayer={onSelectPlayer} />
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
      {onStart || onEdit || onRemove ? (
        <div className="flex flex-nowrap items-center gap-1 touch:gap-1.5">
          {onStart ? (
            <Button
              size="xs"
              variant={ready ? 'primary' : 'secondary'}
              disabled={!ready}
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
