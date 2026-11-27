import type { WinChance } from '@rotra/data/match/win-chance'
import { elapsedTime, queueTime } from '@rotra/schema/queue-time'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { OverflowMenu, type OverflowMenuItem } from '@rotra/ui/overflow-menu'
import { PairFaces, type PairFacesPlayer } from '@rotra/ui/pair-faces'
import { Switch } from '@rotra/ui/switch'
import { WinChanceChip } from '@rotra/ui/win-chance-chip'
import type { ReactNode } from 'react'
import './CourtCard.css'
import { courtActsClass, courtCardVariants, freeCourtDropClass } from './CourtCard.variants'

type CourtCardBase = {
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  label: string
  /** The court's closing time, already formatted: "9:00 PM" */
  untilLabel: string
  startLabel?: string
  /** Past its closing time: "Booking ended HH:MM" in warn on every state; the game continues */
  bookingEnded?: boolean
  /** Opened before its planned start (Start anyway): the time line reads "Opened early · planned START – UNTIL" */
  openedEarly?: boolean
  /**
   * ⋯ menu: "Edit" the court's label and window, or "Change time" while a match is on it (always
   * enabled; the court sheet keeps a used start fixed and the match is not touched)
   */
  onEdit?: () => void
  /** ⋯ menu: "Change court label" (free and busy courts); opens the CourtLabelForm dialog */
  onChangeLabel?: () => void
  /** ⋯ menu: Undo early open, back to Not open yet; disabled while a match is on the court */
  onUndoEarlyOpen?: () => void
  className?: string
}

/** A match on the court: Getting ready (On court) or Playing */
type CourtCardMatchBase = CourtCardBase & {
  /** A 5v5 on two courts: two stacked courts, "Merged · Waiting" / "Merged · Playing" (Ending, Ending soon) */
  merged?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  /**
   * Win chance (D-2026-11-27-02): one chip before the status, "39% · 61%", left pair first. Queue
   * Master only; the read-only card never shows it.
   */
  winChance?: WinChance
  /** Makes the win chance chip a button that opens WinChanceDialog */
  onOpenWinChance?: () => void
  onOpenProfile?: (playerId: string) => void
  /**
   * Opens the player's games this session (D-SESSION-GAMES). Makes the games badge on each face its own
   * button next to the face button, named “NAME's games this session, N”; display only without it.
   */
  onOpenGames?: (playerId: string) => void
  /** "Doubles", "5v5 fun" */
  formatLabel: string
  matchNo: number
  /**
   * Makes the court drawing the Open match button (`role="button"`, Enter or Space, tooltip "Open match");
   * faces still open the profile. There is no Open match button on the card any more (owner, November 26, 2026).
   */
  onOpenMatch?: () => void
  /**
   * Makes the drawing draggable (mouse after 6 px, touch after press and hold). Dropping it on a free
   * court that carries `dropCourtId` reports that court's id; anywhere else does nothing.
   */
  onDragMove?: (courtId: string) => void
  /**
   * Owner, November 25, 2026: a busy one-court court a dragged drawing can land on; the two matches
   * trade courts. Its own drawing never targets it. Leave out for a merged 5v5 court.
   */
  dropCourtId?: string
  /** ⋯ menu: Remove, disabled here with "Only a free court can be removed" */
  onRemove?: () => void
}

/**
 * The top-right status of a Playing court (owner, November 26, 2026): Playing for the first half of a
 * typical game, Ending for the second half, Ending soon from Finishing soon on or while Almost done is
 * on. Ending and Ending soon are pills with a pulsing dot; Running long keeps Ending soon in warn.
 * The container decides all three; the card only draws them.
 */
export type CourtCardStatus = {
  label: 'Playing' | 'Ending' | 'Ending soon'
  tone: 'accent' | 'warn'
  /** The estimate on hover: "Ends in about 4 min", "Almost done" */
  title?: string
}

/** Playing: a started match. Steady accent glow, the status top right, the match line with the elapsed time. */
export type CourtCardInGameProps = CourtCardMatchBase & {
  variant: 'in-game'
  /** Minutes since Start match */
  minutes: number
  substitutions?: number
  /** Renders the secondary "Pause match" button (pause icon) above Match done: back to Getting ready */
  onPause?: () => void
  /** Renders the primary "Match done" button; opens the result */
  onMatchDone?: () => void
  /** Top-right status beside the ⋯ menu; omitted reads Playing (accent) */
  status?: CourtCardStatus
  /** Almost done is on: the switch is checked (the container also sets `status` to Ending soon) */
  almostDone?: boolean
  /**
   * The Almost done row (label left, switch right) under the match line. The row renders only with this
   * callback; the Queue Master flips it after asking the players.
   */
  onAlmostDoneChange?: (on: boolean) => void
  /** ⋯ menu: "Move to a free court"; the item shows only when this is given */
  onMoveToFree?: () => void
  /** No free court can take the match (a two-court match needs two): the item is disabled with "No court is free" */
  noFreeCourt?: boolean
}

/** The next ready waiting match the ⋯ menu's Swap would put on this court */
export type CourtCardSwapMatch = {
  /** Position in the queue, 1-based */
  position: number
  matchNo: number
}

/** Getting ready: a match On court, placed but not started. Normal border, no minutes. */
export type CourtCardOnCourtProps = CourtCardMatchBase & {
  variant: 'on-court'
  /** Why it can't start yet ("Mikee is not present"): shown in warn and disables Start match */
  blockedReason?: string
  /** Renders "Start match" (primary), the only button on the card, when given */
  onStartMatch?: () => void
  /** ⋯ menu: "Swap with #P · Match N"; the item shows only when this is given */
  onSwap?: () => void
  /** The match Swap would bring on; null or missing disables the item with "No other waiting match is ready" */
  swapWith?: CourtCardSwapMatch | null
}

/** The waiting match this court can start next */
export type CourtCardNextMatch = {
  /** "Skipped #1: Mikee is playing on Court 1" when earlier matches are blocked */
  skippedReason?: string
  /** Position in the queue, 1-based */
  position: number
  formatLabel: string
  /** Short names per team */
  teamA: string[]
  teamB: string[]
  /**
   * Owner, November 25, 2026: each pair's pictures before its names ("(faces) Danna & Darryn vs
   * (faces) Derr & Dexter"). Without them the line is the names only.
   */
  facesA?: PairFacesPlayer[]
  facesB?: PairFacesPlayer[]
}

export type CourtCardFreeProps = CourtCardBase & {
  variant: 'free'
  /**
   * Whole minutes since the court became free (the last match on it ended, or it opened): the chip
   * reads "Free · N min" ("N h", "long time ago" from 24 h), amber from 10, red from 16. Omit or null for a plain "Free".
   */
  freeMinutes?: number | null
  notOpen?: boolean
  removed?: boolean
  /**
   * A free open court that a dragged match can land on: the court's id, set as `data-free-court` and
   * handed back to the dragged card's onDragMove. Leave out for Not open yet, removed and busy courts.
   * While any drawing is being dragged the card shows a dashed accent outline, solid with a tint while
   * the pointer is over it.
   */
  dropCourtId?: string
  /** Forces the dashed outline (a drag is in progress); the drag itself shows it without this */
  dragging?: boolean
  /** Forces the solid outline and tint (the dragged drawing is over this court) */
  dragOver?: boolean
  /** The session's last court: Remove is disabled with "A session needs at least one court" */
  isLastCourt?: boolean
  /** ⋯ menu: Remove */
  onRemove?: () => void
  /** Not open yet: renders "Start anyway" (the owner confirms, then opens the court early) */
  onStartAnyway?: () => void
  /**
   * A free open court: the picture is a button (Enter or Space) with a dashed + disc over FREE and
   * "Tap to fill", named "COURT is free. Pick a match from the queue or generate one". Opens the
   * Court N is free sheet. Not open yet and removed courts keep the plain picture.
   */
  onFill?: () => void
  /** A ready match; when missing the body says why none can go on, or that the queue is empty */
  next?: CourtCardNextMatch | null
  /** Fewer free players than the smallest standard match needs: "Not enough free players." (wins over blockedReason and the empty queue) */
  notEnoughFreePlayers?: boolean
  /** Why no waiting match can go on (the first match's reason); omit when the queue is empty */
  blockedReason?: string
  /** Renders "Put on court" when given: places the next eligible match, nothing starts */
  onPutOnCourt?: () => void
  /** @deprecated From before the On court step: renders "Review and start" when onPutOnCourt is missing. Use onPutOnCourt. */
  onReviewAndStart?: () => void
  /** Renders "Pick another"; pass it only when more than one match waits */
  onPickAnother?: () => void
  /** Renders "Add match" when given */
  onAddMatch?: () => void
}

export type CourtCardReadOnlyProps = {
  variant: 'read-only'
  label: string
  state: 'playing' | 'getting-ready' | 'free'
  merged?: boolean
  teamA?: CourtPlayer[]
  teamB?: CourtPlayer[]
  /** Formatted start time, supplied by the caller. */
  startedLabel?: string
  /** Free only: "Free · N min" (see CourtCardFreeProps.freeMinutes) */
  freeMinutes?: number | null
  /** The public page for a signed-in player: each face opens the profile card (“NAME. View profile”) */
  onOpenProfile?: (playerId: string) => void
  className?: string
}

export type CourtCardProps =
  | CourtCardInGameProps
  | CourtCardOnCourtProps
  | CourtCardFreeProps
  | CourtCardReadOnlyProps

function TimeLine({
  startLabel,
  untilLabel,
  bookingEnded,
  openedEarly,
}: Pick<CourtCardBase, 'startLabel' | 'untilLabel' | 'bookingEnded' | 'openedEarly'>) {
  return (
    <span className={cn('text-[13px]', bookingEnded ? 'text-warn' : 'text-fg2')}>
      {bookingEnded
        ? 'Booking ended '
        : openedEarly && startLabel
          ? `Opened early · planned ${startLabel} – `
          : startLabel
            ? `${startLabel} – `
            : 'Until '}
      {untilLabel}
    </span>
  )
}

/** Swap (Getting ready only), Move to a free court (Playing only), Edit / Change time, Undo early open and Remove; the card keeps only the actions for its state. */
function CourtMenu({
  label,
  busy,
  isLastCourt = false,
  onSwap,
  swapWith,
  onMoveToFree,
  noFreeCourt = false,
  onChangeLabel,
  onEdit,
  onUndoEarlyOpen,
  onRemove,
}: {
  label: string
  busy: boolean
  isLastCourt?: boolean
  onSwap?: () => void
  swapWith?: CourtCardSwapMatch | null
  onMoveToFree?: () => void
  noFreeCourt?: boolean
  onChangeLabel?: () => void
  onEdit?: () => void
  onUndoEarlyOpen?: () => void
  onRemove?: () => void
}) {
  const items: OverflowMenuItem[] = []
  if (onSwap)
    items.push(
      swapWith
        ? { label: `Swap with #${swapWith.position} · Match ${swapWith.matchNo}`, onSelect: onSwap }
        : {
            label: 'Swap with the queue',
            onSelect: onSwap,
            disabledReason: 'No other waiting match is ready',
          },
    )
  if (onMoveToFree)
    items.push({
      label: 'Move to a free court',
      onSelect: onMoveToFree,
      disabledReason: noFreeCourt ? 'No court is free' : undefined,
    })
  if (onChangeLabel) items.push({ label: 'Change court label', onSelect: onChangeLabel })
  if (onEdit) items.push({ label: busy ? 'Change time' : 'Edit', onSelect: onEdit })
  if (onUndoEarlyOpen)
    items.push({
      label: 'Undo early open',
      onSelect: onUndoEarlyOpen,
      disabledReason: busy ? 'A match is on this court' : undefined,
    })
  if (onRemove)
    items.push({
      label: 'Remove',
      onSelect: onRemove,
      destructive: true,
      disabledReason: busy
        ? 'Only a free court can be removed'
        : isLastCourt
          ? 'A session needs at least one court'
          : undefined,
    })
  return items.length ? <OverflowMenu label={`More for ${label}`} items={items} /> : null
}

/**
 * The free court chip (the prototype's freeChip): "Free · N min", coloured like waiting players
 * (neutral under 10 min, warn from 10, error from 16); plain "Free" when the minutes are unknown.
 */
export function FreeCourtChip({ minutes }: { minutes?: number | null }) {
  if (minutes == null) return <Chip>Free</Chip>
  return (
    <Chip tone={minutes >= 16 ? 'error' : minutes >= 10 ? 'warn' : 'neutral'}>
      Free · {queueTime(minutes)}
    </Chip>
  )
}

/** Prototype listNames(): "Mikee and Dexter", "Mikee, Dexter and Jose" */
function listNames(names: string[]) {
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The status pill beside a court's ⋯ menu (the mockup's .ct-end): Playing is a plain accent chip;
 * Ending and Ending soon add a pulsing dot (accent, or warn for Running long). The pulse stops under
 * reduced motion. `title` carries the estimate text; a merged court prefixes "Merged · ".
 */
export function CourtStatusPill({
  status,
  merged = false,
}: {
  status: CourtCardStatus
  merged?: boolean
}) {
  const label = merged ? `Merged · ${status.label}` : status.label
  if (status.label === 'Playing')
    return (
      <Chip tone={status.tone} title={status.title}>
        {label}
      </Chip>
    )
  return (
    <span
      title={status.title}
      className={cn(
        'inline-flex items-center gap-[7px] self-start rounded-full border py-[3px] pr-2.5 pl-2 text-xs font-bold whitespace-nowrap',
        status.tone === 'warn'
          ? 'border-warn/45 bg-warn-subtle text-warn'
          : 'border-accent/45 bg-accent-subtle text-accent',
      )}
    >
      <i
        aria-hidden
        className={cn(
          'court-status-dot relative size-2 flex-none rounded-full',
          status.tone === 'warn' ? 'bg-warn' : 'bg-accent',
        )}
      />
      {label}
    </span>
  )
}

/**
 * The match line under a court's picture (the mockup's .ct-meta): a green #N in the mono font, the
 * format as a pill, then the elapsed-time pill with its clock (Playing) or "Waiting to start"
 * (Getting ready), then "N substitution(s)" as muted text. `trailing` adds the status pill in the
 * match dialog's head.
 */
export function CourtMatchLine({
  matchNo,
  formatLabel,
  minutes,
  substitutions = 0,
  trailing,
}: {
  matchNo: number
  formatLabel: string
  /** Minutes since Start match; omit for a Getting ready match (shows "Waiting to start") */
  minutes?: number
  substitutions?: number
  trailing?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <b className="font-mono text-xl leading-none font-extrabold text-accent tabular-nums">
        #{matchNo}
      </b>
      <Chip tone="solid">{formatLabel}</Chip>
      {minutes === undefined ? (
        <Chip>Waiting to start</Chip>
      ) : (
        <Chip className="tabular-nums">
          <Icon name="clock" size={12} />
          {elapsedTime(minutes)}
        </Chip>
      )}
      {substitutions > 0 ? (
        <span className="text-[13px] text-fg2">
          {substitutions} substitution{substitutions > 1 ? 's' : ''}
        </span>
      ) : null}
      {trailing}
    </div>
  )
}

/**
 * The Almost done row (D-2026-11-25-02): the label left, the switch right. The Queue Master flips it
 * after asking the players; the card and the match dialog share it.
 */
export function AlmostDoneRow({
  courtLabel,
  checked,
  onChange,
}: {
  /** "Court 1", or "Court 1 + Court 2": names the switch "Almost done, Court 1" */
  courtLabel: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the label wraps the switch button
    <label className="flex flex-nowrap items-center justify-between gap-2">
      <span className="text-[13px] font-bold">Almost done</span>
      <Switch checked={checked} onChange={onChange} aria-label={`Almost done, ${courtLabel}`} />
    </label>
  )
}

/**
 * One court in the live console, in one of three states, always written as a chip: Free (empty
 * drawing, the next eligible match or why none can go on), Getting ready (a match On court, status
 * Waiting: Start match) or Playing (steady accent glow, status Playing / Ending / Ending soon, Almost
 * done row, Pause match and Match done). The court picture opens the match. The prototypes' .court,
 * .court.oncourt and .court.busy.
 */
export function CourtCard(props: CourtCardProps) {
  if (props.variant === 'read-only') return <ReadOnlyCourtCard {...props} />
  if (props.variant === 'in-game') return <PlayingCourtCard {...props} />
  if (props.variant === 'on-court') return <GettingReadyCourtCard {...props} />
  return <FreeCourtCard {...props} />
}

function ReadOnlyCourtCard({
  label,
  state,
  merged = false,
  teamA = [],
  teamB = [],
  startedLabel,
  freeMinutes,
  onOpenProfile,
  className,
}: CourtCardReadOnlyProps) {
  const chip =
    state === 'playing' ? 'Playing' : state === 'getting-ready' ? 'Getting ready' : 'Free'
  return (
    <article
      aria-label={label}
      className={cn(
        courtCardVariants({ variant: state === 'playing' ? 'in-game' : 'free', merged }),
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base">{label}</h3>
        {state === 'free' ? (
          <FreeCourtChip minutes={freeMinutes} />
        ) : (
          <Chip tone={state === 'playing' ? 'accent' : undefined}>
            {merged ? `Merged · ${chip}` : chip}
          </Chip>
        )}
      </div>
      <CourtDrawing
        courts={merged ? 2 : 1}
        free={state === 'free'}
        teamA={teamA}
        teamB={teamB}
        onOpenProfile={onOpenProfile}
        plainProfileLabel
      />
      {state === 'playing' && startedLabel ? (
        <p className="text-[13px] text-fg2">Started {startedLabel}</p>
      ) : null}
      {state === 'getting-ready' ? <p className="text-[13px] text-fg2">Waiting to start</p> : null}
    </article>
  )
}

/** Label, time line, state chip and ⋯ menu, then the court drawing with both teams. */
function MatchCourtHead({
  label,
  untilLabel,
  startLabel,
  bookingEnded,
  openedEarly,
  merged,
  teamA,
  teamB,
  onOpenProfile,
  onOpenGames,
  onOpenMatch,
  onDragMove,
  winChance,
  onOpenWinChance,
  chip,
  menu,
}: Pick<
  CourtCardMatchBase,
  | 'label'
  | 'untilLabel'
  | 'startLabel'
  | 'bookingEnded'
  | 'openedEarly'
  | 'merged'
  | 'teamA'
  | 'teamB'
  | 'onOpenProfile'
  | 'onOpenGames'
  | 'onOpenMatch'
  | 'onDragMove'
  | 'winChance'
  | 'onOpenWinChance'
> & { chip: ReactNode; menu: ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{label}</h3>
          <TimeLine {...{ startLabel, untilLabel, bookingEnded, openedEarly }} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          {winChance ? (
            <WinChanceChip
              chance={winChance}
              onOpen={onOpenWinChance}
              teamNames={{
                a: listNames(teamA.map((p) => p.shortName)),
                b: listNames(teamB.map((p) => p.shortName)),
              }}
            />
          ) : null}
          {chip}
          {menu}
        </div>
      </div>
      <CourtDrawing
        courts={merged ? 2 : 1}
        teamA={teamA}
        teamB={teamB}
        onOpenProfile={onOpenProfile}
        onOpenGames={onOpenGames}
        onOpenMatch={onOpenMatch}
        onDragMove={onDragMove}
      />
    </>
  )
}

function PlayingCourtCard({
  label,
  untilLabel,
  startLabel,
  bookingEnded = false,
  merged = false,
  teamA,
  teamB,
  onOpenProfile,
  onOpenGames,
  formatLabel,
  matchNo,
  minutes,
  substitutions = 0,
  status = { label: 'Playing', tone: 'accent' },
  almostDone = false,
  onAlmostDoneChange,
  onOpenMatch,
  onDragMove,
  winChance,
  onOpenWinChance,
  dropCourtId,
  onPause,
  onMatchDone,
  onMoveToFree,
  noFreeCourt = false,
  openedEarly = false,
  onChangeLabel,
  onEdit,
  onUndoEarlyOpen,
  onRemove,
  className,
}: CourtCardInGameProps) {
  return (
    <article
      aria-label={label}
      data-free-court={merged ? undefined : dropCourtId}
      className={cn(
        courtCardVariants({ variant: 'in-game', merged }),
        !merged && dropCourtId && freeCourtDropClass({}),
        className,
      )}
    >
      <MatchCourtHead
        {...{ label, untilLabel, startLabel, bookingEnded, openedEarly, merged }}
        {...{
          teamA,
          teamB,
          onOpenProfile,
          onOpenGames,
          onOpenMatch,
          onDragMove,
          winChance,
          onOpenWinChance,
        }}
        chip={<CourtStatusPill status={status} merged={merged} />}
        menu={
          <CourtMenu
            busy
            {...{
              label,
              onMoveToFree,
              noFreeCourt,
              onChangeLabel,
              onEdit,
              onUndoEarlyOpen,
              onRemove,
            }}
          />
        }
      />
      <CourtMatchLine {...{ matchNo, formatLabel, minutes, substitutions }} />
      {onAlmostDoneChange ? (
        <AlmostDoneRow courtLabel={label} checked={almostDone} onChange={onAlmostDoneChange} />
      ) : null}
      {onPause || onMatchDone ? (
        <div className={courtActsClass}>
          {onPause ? (
            <Button
              size="sm"
              onClick={onPause}
              title="Back to Getting ready, for a match started by mistake"
            >
              <Icon name="pause" size={14} />
              Pause match
            </Button>
          ) : null}
          {onMatchDone ? (
            <Button size="sm" variant="primary" onClick={onMatchDone}>
              Match done
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function GettingReadyCourtCard({
  label,
  untilLabel,
  startLabel,
  bookingEnded = false,
  merged = false,
  teamA,
  teamB,
  onOpenProfile,
  onOpenGames,
  formatLabel,
  matchNo,
  blockedReason,
  onStartMatch,
  onOpenMatch,
  onDragMove,
  winChance,
  onOpenWinChance,
  dropCourtId,
  onSwap,
  swapWith,
  openedEarly = false,
  onChangeLabel,
  onEdit,
  onUndoEarlyOpen,
  onRemove,
  className,
}: CourtCardOnCourtProps) {
  return (
    <article
      aria-label={label}
      data-free-court={merged ? undefined : dropCourtId}
      className={cn(
        courtCardVariants({ variant: 'on-court', merged }),
        !merged && dropCourtId && freeCourtDropClass({}),
        className,
      )}
    >
      <MatchCourtHead
        {...{ label, untilLabel, startLabel, bookingEnded, openedEarly, merged }}
        {...{
          teamA,
          teamB,
          onOpenProfile,
          onOpenGames,
          onOpenMatch,
          onDragMove,
          winChance,
          onOpenWinChance,
        }}
        chip={<Chip>{merged ? 'Merged · Waiting' : 'Waiting'}</Chip>}
        menu={
          <CourtMenu
            busy
            {...{ label, onSwap, swapWith, onChangeLabel, onEdit, onUndoEarlyOpen, onRemove }}
          />
        }
      />
      <CourtMatchLine {...{ matchNo, formatLabel }} />
      {blockedReason ? (
        <span className="flex items-start gap-1.5 text-[13px] text-warn">
          <Icon name="alert" className="mt-0.5 flex-none" />
          {blockedReason}
        </span>
      ) : null}
      {onStartMatch ? (
        <div className={courtActsClass}>
          <Button
            size="sm"
            variant="primary"
            onClick={onStartMatch}
            disabled={!!blockedReason}
            title={blockedReason}
          >
            Start match
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function FreeCourtCard({
  label,
  untilLabel,
  startLabel,
  bookingEnded = false,
  notOpen = false,
  removed = false,
  freeMinutes,
  isLastCourt = false,
  onRemove,
  onStartAnyway,
  onFill,
  dropCourtId,
  dragging = false,
  dragOver = false,
  openedEarly = false,
  onChangeLabel,
  onEdit,
  onUndoEarlyOpen,
  next,
  notEnoughFreePlayers = false,
  blockedReason,
  onPutOnCourt,
  onReviewAndStart,
  onPickAnother,
  onAddMatch,
  className,
}: CourtCardFreeProps) {
  const onPlace = onPutOnCourt ?? onReviewAndStart
  return (
    <article
      aria-label={label}
      data-free-court={!removed && !notOpen ? dropCourtId : undefined}
      className={cn(
        courtCardVariants({ variant: 'free' }),
        !removed && !notOpen && dropCourtId && freeCourtDropClass({ dragging, dragOver }),
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{label}</h3>
          <TimeLine {...{ startLabel, untilLabel, bookingEnded, openedEarly }} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          {removed || notOpen ? (
            <Chip>{removed ? 'Removed' : 'Not open yet'}</Chip>
          ) : (
            <FreeCourtChip minutes={freeMinutes} />
          )}
          {removed ? null : (
            <CourtMenu
              busy={false}
              {...{ label, isLastCourt, onChangeLabel, onEdit, onUndoEarlyOpen, onRemove }}
            />
          )}
        </div>
      </div>
      <CourtDrawing
        free
        freeLabel={removed ? 'Removed' : notOpen ? 'Not open yet' : 'Free'}
        onFill={removed || notOpen ? undefined : onFill}
        fillLabel={`${label} is free. Pick a match from the queue or generate one`}
      />
      {removed ? (
        <p className="text-[13px] text-fg2">Manually removed from this session.</p>
      ) : notOpen ? (
        <>
          <p className="text-[13px] text-fg2">
            Opens at {startLabel}. The court is unavailable before this time.
          </p>
          {onStartAnyway ? (
            <div className={courtActsClass}>
              <Button size="sm" variant="primary" onClick={onStartAnyway}>
                Start anyway
              </Button>
            </div>
          ) : null}
        </>
      ) : next ? (
        <>
          {next.skippedReason ? (
            <p className="text-[13px] text-fg2">{next.skippedReason}.</p>
          ) : null}
          <p className="text-[13px]">
            <span className="text-fg2">Next eligible:</span> #{next.position} · {next.formatLabel}
          </p>
          <p className="text-[13px]">
            {next.facesA && next.facesB ? (
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <PairFaces players={next.facesA} />
                <span className="text-fg2">vs</span>
                <PairFaces players={next.facesB} />
              </span>
            ) : (
              <>
                {listNames(next.teamA)} <span className="text-fg2">vs</span> {listNames(next.teamB)}
              </>
            )}
          </p>
          {onPlace || onPickAnother ? (
            <div className={courtActsClass}>
              {onPlace ? (
                <Button size="sm" variant="primary" onClick={onPlace}>
                  {onPutOnCourt ? 'Put on court' : 'Review and start'}
                </Button>
              ) : null}
              {onPickAnother ? (
                <Button size="sm" onClick={onPickAnother}>
                  Pick another
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[13px] text-fg2">
            {notEnoughFreePlayers
              ? 'Not enough free players.'
              : blockedReason
                ? `No waiting match can go on: ${blockedReason}.`
                : 'The queue is empty.'}
          </p>
          {onAddMatch ? (
            <div className={courtActsClass}>
              <Button size="sm" onClick={onAddMatch}>
                Add match
              </Button>
            </div>
          ) : null}
        </>
      )}
    </article>
  )
}
