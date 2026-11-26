import type { MatchFormat, MatchOrigin, MatchStatus } from '@rotra/data/match/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { levelLabel } from '@rotra/ui/level-pill'
import { PlayerFaceButton, type PlayerWait } from '@rotra/ui/player-face-button'
import { PlayerNameBlock } from '@rotra/ui/player-name-block'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'
import { type ComponentProps, Fragment } from 'react'
import { matchCardVariants } from './MatchCard.variants'

/** One player on a queue card: picture and short name, full name and level for the label. */
export type MatchCardPlayer = {
  id: string
  name: string
  /** Nickname or first name: inline text ("A & B"), and the label when no nickname fields are given */
  shortName: string
  /**
   * The player's own nickname and the club nickname (registered players only). Giving either (null
   * counts) draws the club-facing face names (D-2026-11-26-09): the label, then the other names in
   * smaller lines under it. `name` is the full name.
   */
  nickname?: string | null
  clubNickname?: string | null
  level: PlayingLevel | null
  photoUrl?: string
  /**
   * Live session status pill under the name (In queue Nm, Playing Nm, Getting ready, Away). Omit when the session
   * is not live; the console computes the minutes (Q12.22).
   */
  wait?: PlayerWait
  /** Games this player has played in the session: the badge on the picture's ring (0 shows "0") */
  games?: number
}

export type MatchCardTeam = 'A' | 'B'

/** The flow arrow the queue grid draws after a card: right or left along the snake, down at a row end */
export type MatchCardFlow = 'right' | 'left' | 'down'

/** @deprecated Draft tiles no longer show chips under the names (2026-11-23); kept so callers compile. */
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
  /**
   * Status line tone: 'warn' when the awaited match runs long ("Waits for Court 2 · running long").
   * Default 'muted'; the info icon stays. The text is `status.reason`.
   */
  statusTone?: 'muted' | 'warn'
  /** @deprecated Ignored: draft tiles show the ring and the games badge only. */
  playerChips?: Record<string, MatchCardPlayerChip[]>
}

export type MatchCardProps = {
  /** Queue position P, shown as "#P" */
  position: number
  /** Match number N, used in the handle and Remove labels */
  matchNo: number
  format: MatchFormat
  /**
   * Category prefix of the format chip: "Mixed" gives "Mixed Doubles", "Genderless" gives
   * "Genderless 3v3 fun". Omit for the plain format label.
   */
  categoryPrefix?: string
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
  /** Opens the player's games this session (the games badge). Makes the badge its own button. */
  onOpenGames?: (playerId: string) => void
  /**
   * 'button': the badge is a focusable button next to the face button (needs onOpenGames).
   * 'static': display only, for faces inside other dialogs. Default: 'button' with onOpenGames, else 'static'.
   */
  gamesBadge?: 'button' | 'static'
  /** Start: rendered only when given, enabled only when the match is ready */
  onStart?: () => void
  /**
   * The match only waits for a court and a court is not open yet: Start stays enabled, and the
   * Start match sheet offers Start anyway on that court.
   */
  canOpenCourt?: boolean
  /** The Start button's text; "Start" by default ("Put on court" in the queue's dialogs) */
  startLabel?: string
  /** The Start button's accessible name when the text alone is not enough ("Put on Court 2") */
  startAriaLabel?: string
  /** Edit the lineup: rendered only when given */
  onEdit?: () => void
  /** Remove the waiting match: rendered only when given */
  onRemove?: () => void
  /** Renders the card as a selectable Auto Queue draft */
  draft?: MatchCardDraft
  /** Public queue: static faces, no drag handle, actions or operator origin metadata. */
  readOnly?: boolean
  /** Search highlights matching players without changing the match. */
  searchState?: 'hit' | 'dim'
  highlightedPlayerIds?: string[]
  /**
   * 'compact' (Courts tab › Upcoming queued matches): no wait times; each team is an overlapping stack
   * of 34 px pictures with level rings and the short names on one line. Head, status line and
   * buttons stay. Default 'default'. Draft tiles ignore it.
   */
  variant?: 'default' | 'compact'
  /**
   * A card inside a carousel slide (Put a match on Court N): no reorder handle and no flow arrow,
   * the card fills the slide's height, and Start and Edit share the row at the same width. A drag
   * anywhere on it belongs to the carousel; taps on faces and buttons still work. Used with
   * `variant="compact"` and without `swappable`.
   */
  slide?: boolean
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

/** The 3 px level ring (prototype .qtile .qf outline): Beginner, Intermediate, Advanced; grey with no level. */
function levelRingClass(level: PlayingLevel | null) {
  const colour = level?.startsWith('beginner')
    ? 'outline-lv-beg'
    : level?.startsWith('intermediate')
      ? 'outline-lv-int'
      : level?.startsWith('advanced')
        ? 'outline-lv-adv'
        : 'outline-lv-none'
  return `outline-3 outline-offset-2 ${colour}`
}

const gamesCopy = (n: number) => `${n} game${n === 1 ? '' : 's'}`

// The prototype's .pf-g on a queue face: top right of the ring, white at rest, accent on hover.
const BADGE_BASE =
  'absolute top-[-3px] left-[calc(50%+31px)] z-[1] grid h-[17px] min-w-[17px] -translate-x-full place-items-center rounded-full bg-on-photo/90 px-1 text-[11px] leading-none font-extrabold text-photo-label tabular-nums'

/** The games badge beside a face: its own button with onOpenGames, display only otherwise. */
function GamesBadge({
  player,
  mode,
  onOpenGames,
}: {
  player: MatchCardPlayer
  mode: 'button' | 'static'
  onOpenGames?: (playerId: string) => void
}) {
  if (player.games === undefined) return null
  if (mode === 'button' && onOpenGames) {
    return (
      <button
        type="button"
        aria-label={`${player.name}'s games this session, ${player.games}`}
        title={`${player.name}'s games this session · tap to see them`}
        onClick={(e) => {
          e.stopPropagation()
          onOpenGames(player.id)
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          BADGE_BASE,
          'cursor-pointer border-0 before:absolute before:-inset-1.5 before:content-[""]',
          'hover:bg-accent hover:text-on-accent hover:ring-2 hover:ring-surface',
          'focus-visible:bg-accent focus-visible:text-on-accent focus-visible:ring-2 focus-visible:ring-surface',
          'touch:before:-inset-2',
        )}
      >
        {player.games}
      </button>
    )
  }
  return (
    <span role="img" aria-label={gamesCopy(player.games)} className={BADGE_BASE}>
      {player.games}
    </span>
  )
}

function Faces({
  players,
  team,
  swappable,
  onSelectPlayer,
  onOpenGames,
  gamesBadge,
  highlightedPlayerIds = [],
}: {
  highlightedPlayerIds?: string[]
  players: MatchCardPlayer[]
  team: MatchCardTeam
  swappable: boolean
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
  onOpenGames?: (playerId: string) => void
  gamesBadge: 'button' | 'static'
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5">
      {players.map((p, i) => {
        const face = (
          <div key={p.id} className="relative flex min-w-0 flex-col items-center">
            <PlayerFaceButton
              name={p.name}
              shortName={p.shortName}
              nickname={p.nickname}
              clubNickname={p.clubNickname}
              level={p.level}
              photoUrl={p.photoUrl}
              label={`${p.name}, Team ${team}${p.games === undefined ? '' : `, ${gamesCopy(p.games)}`}. View profile`}
              size="queue"
              wait={p.wait}
              className={cn(
                '[&>:first-child]:outline-3 [&>:first-child]:outline-offset-2',
                levelRingVariant(p.level),
                highlightedPlayerIds.includes(p.id) &&
                  '[&>:first-child]:!ring-[3px] [&>:first-child]:!ring-warn [&>:nth-child(2)]:!font-extrabold [&>:nth-child(2)]:!text-warn [&>:nth-child(2)>:first-child]:!font-extrabold [&>:nth-child(2)>:first-child]:!text-warn',
              )}
              swap={swappable ? { team, index: i } : undefined}
              onClick={() => onSelectPlayer?.(p.id, team)}
            />
            <GamesBadge player={p} mode={gamesBadge} onOpenGames={onOpenGames} />
          </div>
        )
        return swappable ? (
          <SwappablePlayer key={p.id} team={team} index={i}>
            {face}
          </SwappablePlayer>
        ) : (
          <Fragment key={p.id}>{face}</Fragment>
        )
      })}
    </div>
  )
}

/** The face's outline colour, applied to the picture (first child of the face button). */
function levelRingVariant(level: PlayingLevel | null) {
  return level?.startsWith('beginner')
    ? '[&>:first-child]:outline-lv-beg'
    : level?.startsWith('intermediate')
      ? '[&>:first-child]:outline-lv-int'
      : level?.startsWith('advanced')
        ? '[&>:first-child]:outline-lv-adv'
        : '[&>:first-child]:outline-lv-none'
}

/**
 * A draft's and a read-only card's faces: the same ring, picture, games badge and name, not a
 * profile button. The badge is its own button only when the card gives onOpenGames.
 */
function StaticFaces({
  players,
  onOpenGames,
  gamesBadge,
}: {
  players: MatchCardPlayer[]
  onOpenGames?: (playerId: string) => void
  gamesBadge: 'button' | 'static'
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5">
      {players.map((p) => (
        <div
          key={p.id}
          className="relative flex min-w-0 flex-col items-center gap-px p-0.5"
          title={p.name}
        >
          <Avatar
            name={p.name}
            src={p.photoUrl}
            size={44}
            className={cn(levelRingClass(p.level), 'touch:size-[46px] touch:text-[15px]')}
          />
          {p.nickname !== undefined || p.clubNickname !== undefined ? (
            <PlayerNameBlock
              layout="face"
              fullName={p.name}
              nickname={p.nickname}
              clubNickname={p.clubNickname}
              labelClassName="max-w-[88px] text-[15px] leading-normal font-semibold text-fg"
              lineClassName="max-w-[88px]"
            />
          ) : (
            <span className="max-w-[88px] truncate text-[15px] font-semibold text-fg">
              {p.shortName}
            </span>
          )}
          <GamesBadge player={p} mode={gamesBadge} onOpenGames={onOpenGames} />
        </div>
      ))}
    </div>
  )
}

/** The compact picture's level ring (prototype .qs-f): 2 px outline plus a 3 px surface gap. */
function compactRingClass(level: PlayingLevel | null) {
  const colour = level?.startsWith('beginner')
    ? 'outline-lv-beg'
    : level?.startsWith('intermediate')
      ? 'outline-lv-int'
      : level?.startsWith('advanced')
        ? 'outline-lv-adv'
        : 'outline-lv-none'
  return `outline-2 outline-offset-0 shadow-[0_0_0_3px_var(--surface)] ${colour}`
}

/** One picture of a compact team: a profile button (a plain picture when read only). */
function CompactFace({
  player: p,
  team,
  index,
  swappable,
  readOnly,
  highlighted,
  onSelectPlayer,
}: {
  player: MatchCardPlayer
  team: MatchCardTeam
  index: number
  swappable: boolean
  readOnly: boolean
  highlighted: boolean
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
}) {
  const picture = (
    <Avatar
      name={p.name}
      src={p.photoUrl}
      size={36}
      className={cn(
        'size-[34px] text-xs',
        compactRingClass(p.level),
        highlighted && 'outline-warn',
      )}
    />
  )
  if (readOnly)
    return (
      <span title={`${p.name} · ${levelLabel(p.level)}`} className="-ml-2 inline-flex rounded-full">
        {picture}
      </span>
    )
  return (
    <button
      type="button"
      title={`${p.name} · ${levelLabel(p.level)}${swappable ? ' · drag onto the other team to switch sides' : ''}`}
      aria-label={`${p.name}, ${levelLabel(p.level)}, Team ${team}. View profile${swappable ? '. Left or right arrow switches sides' : ''}`}
      data-team={swappable ? team : undefined}
      data-i={swappable ? index : undefined}
      onClick={() => onSelectPlayer?.(p.id, team)}
      className="-ml-2 cursor-pointer rounded-full border-0 bg-transparent p-0 hover:relative hover:z-[1]"
    >
      {picture}
    </button>
  )
}

/**
 * The compact variant's team (prototype .qt-vs .qstack-row, owner, November 25, 2026): an overlapping
 * stack of 34 px pictures with level rings above the short names ("Rafa & Migo"); the two teams sit
 * side by side with VS between. No wait times, no games badge.
 * Pictures open the profile and, inside a SwapSidesArea, can be dragged onto the other team.
 */
function CompactFaces({
  players,
  team,
  swappable,
  readOnly,
  onSelectPlayer,
  highlightedPlayerIds = [],
}: {
  players: MatchCardPlayer[]
  team: MatchCardTeam
  swappable: boolean
  readOnly: boolean
  onSelectPlayer?: (playerId: string, team: MatchCardTeam) => void
  highlightedPlayerIds?: string[]
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div className="flex flex-none pl-2">
        {players.map((p, i) => {
          const canSwap = swappable && !readOnly
          const face = {
            player: p,
            team,
            index: i,
            swappable: canSwap,
            readOnly,
            highlighted: highlightedPlayerIds.includes(p.id),
            onSelectPlayer,
          }
          return canSwap ? (
            <SwappablePlayer key={p.id} team={team} index={i} className="rounded-full">
              <CompactFace {...face} />
            </SwappablePlayer>
          ) : (
            <CompactFace key={p.id} {...face} />
          )
        })}
      </div>
      <span className="min-w-0 truncate text-[13px] font-semibold text-fg">
        {players.map((p) => p.shortName).join(' & ')}
      </span>
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
  categoryPrefix,
  origin,
  manualProtected,
  status,
  teamA,
  teamB,
  flow,
  handleProps,
  swappable = false,
  onSelectPlayer,
  onOpenGames,
  gamesBadge,
  onStart,
  startLabel = 'Start',
  startAriaLabel,
  canOpenCourt = false,
  onEdit,
  onRemove,
  draft,
  className,
  readOnly = false,
  searchState,
  highlightedPlayerIds,
  variant = 'default',
  slide = false,
}: MatchCardProps) {
  const compact = variant === 'compact'
  const ready = status.kind === 'ready'
  const badgeMode = gamesBadge ?? (onOpenGames ? 'button' : 'static')
  const formatLabel = categoryPrefix
    ? `${categoryPrefix} ${FORMAT_LABEL[format]}`
    : FORMAT_LABEL[format]
  const startable = ready || (canOpenCourt && status.kind === 'waiting-for-courts')
  const attention = status.kind === 'needs-attention'
  const { className: handleClassName, ...handleRest } = handleProps ?? {}
  const statusLine = (
    <span
      className={cn(
        'flex items-start gap-1.5 text-xs',
        ready
          ? 'text-accent'
          : attention || draft?.statusTone === 'warn'
            ? 'text-warn'
            : 'text-fg2',
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
        aria-label={`Draft ${formatLabel}: ${teamNames(teamA)} vs ${teamNames(teamB)}${draft.selected && draft.pickOrder ? `, picked ${draft.pickOrder}` : ''}`}
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
          <Chip tone="solid">{formatLabel}</Chip>
        </div>
        <StaticFaces players={teamA} onOpenGames={onOpenGames} gamesBadge={badgeMode} />
        <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
        <StaticFaces players={teamB} onOpenGames={onOpenGames} gamesBadge={badgeMode} />
        {statusLine}
      </div>
    )
  }

  return (
    <article
      aria-label={`Queue position ${position}`}
      className={cn(
        matchCardVariants({ status: status.kind }),
        'mt-2',
        compact && 'gap-2',
        slide && 'mt-0 h-full',
        searchState === 'hit' &&
          '!border-warn shadow-[0_0_0_2px_var(--warn),0_0_16px_2px_color-mix(in_srgb,var(--warn)_40%,transparent)]',
        searchState === 'dim' && 'opacity-45',
        className,
      )}
    >
      {ready ? (
        <span className="absolute -top-2.5 left-3 inline-flex h-5 items-center gap-1 rounded-full bg-accent px-2 text-[11px] font-extrabold tracking-[0.3px] text-on-accent uppercase">
          <Icon name="check" className="size-3" />
          Ready for court
        </span>
      ) : null}
      <div className="flex min-w-0 items-center gap-1.5 touch:-mt-1.5 touch:-mr-1.5">
        <span className="font-mono font-bold">#{position}</span>
        <Chip tone="solid">{formatLabel}</Chip>
        {!readOnly &&
          (manualProtected ? (
            <span className="inline-flex text-fg2" title="Manual · protected from regeneration">
              <Icon name="lock" aria-label="Manual · protected from regeneration" role="img" />
            </span>
          ) : (
            <span className="text-[13px] text-fg2">
              {origin === 'suggested' ? 'Suggested' : origin === 'auto' ? 'Auto' : 'Manual'}
            </span>
          ))}
        <span className="flex-1" />
        {flow && !slide ? (
          <span aria-hidden className="font-extrabold text-fg3">
            {FLOW_ARROW[flow]}
          </span>
        ) : null}
        {!readOnly && !slide ? (
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
        ) : null}
      </div>
      {compact ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <CompactFaces
            players={teamA}
            team="A"
            swappable={swappable}
            readOnly={readOnly}
            onSelectPlayer={onSelectPlayer}
            highlightedPlayerIds={highlightedPlayerIds}
          />
          <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
          <CompactFaces
            players={teamB}
            team="B"
            swappable={swappable}
            readOnly={readOnly}
            onSelectPlayer={onSelectPlayer}
            highlightedPlayerIds={highlightedPlayerIds}
          />
        </div>
      ) : (
        <>
          {readOnly ? (
            <StaticFaces players={teamA} onOpenGames={onOpenGames} gamesBadge={badgeMode} />
          ) : (
            <Faces
              players={teamA}
              team="A"
              swappable={swappable}
              onSelectPlayer={onSelectPlayer}
              onOpenGames={onOpenGames}
              gamesBadge={badgeMode}
              highlightedPlayerIds={highlightedPlayerIds}
            />
          )}
          <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
          {readOnly ? (
            <StaticFaces players={teamB} onOpenGames={onOpenGames} gamesBadge={badgeMode} />
          ) : (
            <Faces
              players={teamB}
              team="B"
              swappable={swappable}
              onSelectPlayer={onSelectPlayer}
              onOpenGames={onOpenGames}
              gamesBadge={badgeMode}
              highlightedPlayerIds={highlightedPlayerIds}
            />
          )}
        </>
      )}
      {statusLine}
      {!readOnly && (onStart || onEdit || onRemove) ? (
        <div className="flex flex-nowrap items-center gap-1 touch:gap-1.5">
          {onStart ? (
            <Button
              size="xs"
              variant={ready ? 'primary' : 'secondary'}
              disabled={!startable}
              aria-label={startAriaLabel}
              onClick={onStart}
              className={cn('touch:flex-1', slide && 'min-h-9 flex-1')}
            >
              {startLabel}
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              size="xs"
              onClick={onEdit}
              className={cn('touch:flex-1', slide && 'min-h-9 flex-1')}
            >
              Edit
            </Button>
          ) : null}
          {slide ? null : <span className="flex-1" />}
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
