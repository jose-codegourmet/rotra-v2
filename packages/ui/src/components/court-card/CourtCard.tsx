import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { OverflowMenu, type OverflowMenuItem } from '@rotra/ui/overflow-menu'
import type { ReactNode } from 'react'
import { courtCardVariants } from './CourtCard.variants'

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
  /** A 5v5 on two courts: two stacked courts, "Merged · Getting ready" / "Merged · Playing" */
  merged?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  onOpenProfile?: (playerId: string) => void
  /** "Doubles", "5v5 fun" */
  formatLabel: string
  matchNo: number
  /** Renders "Open match" when given (primary on Playing, secondary on Getting ready) */
  onOpenMatch?: () => void
  /** ⋯ menu: Remove, disabled here with "Only a free court can be removed" */
  onRemove?: () => void
}

/** Playing: a started match. Steady accent glow, chip "Playing", the minutes in the match line. */
export type CourtCardInGameProps = CourtCardMatchBase & {
  variant: 'in-game'
  /** Minutes since Start match */
  minutes: number
  substitutions?: number
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
  /** Renders "Start match" (primary) when given */
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
}

export type CourtCardFreeProps = CourtCardBase & {
  variant: 'free'
  /**
   * Whole minutes since the court became free (the last match on it ended, or it opened): the chip
   * reads "Free · N min", amber from 10, red from 16. Omit or null for a plain "Free".
   */
  freeMinutes?: number | null
  notOpen?: boolean
  removed?: boolean
  /** The session's last court: Remove is disabled with "A session needs at least one court" */
  isLastCourt?: boolean
  /** ⋯ menu: Remove */
  onRemove?: () => void
  /** Not open yet: renders "Start anyway" (the owner confirms, then opens the court early) */
  onStartAnyway?: () => void
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

/** Swap (Getting ready only), Edit / Change time, Undo early open and Remove; the card keeps only the actions for its state. */
function CourtMenu({
  label,
  busy,
  isLastCourt = false,
  onSwap,
  swapWith,
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
      Free · {minutes} min
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
 * One court in the live console, in one of three states, always written as a chip: Free (empty
 * drawing, the next eligible match or why none can go on), Getting ready (a match On court: Start
 * match, Open match) or Playing (steady accent glow, Open match). The prototypes' .court,
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
      <CourtDrawing courts={merged ? 2 : 1} free={state === 'free'} teamA={teamA} teamB={teamB} />
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
> & { chip: ReactNode; menu: ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{label}</h3>
          <TimeLine {...{ startLabel, untilLabel, bookingEnded, openedEarly }} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          {chip}
          {menu}
        </div>
      </div>
      <CourtDrawing
        courts={merged ? 2 : 1}
        teamA={teamA}
        teamB={teamB}
        onOpenProfile={onOpenProfile}
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
  formatLabel,
  matchNo,
  minutes,
  substitutions = 0,
  onOpenMatch,
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
      className={cn(courtCardVariants({ variant: 'in-game', merged }), className)}
    >
      <MatchCourtHead
        {...{ label, untilLabel, startLabel, bookingEnded, openedEarly, merged }}
        {...{ teamA, teamB, onOpenProfile }}
        chip={<Chip tone="accent">{merged ? 'Merged · Playing' : 'Playing'}</Chip>}
        menu={<CourtMenu busy {...{ label, onChangeLabel, onEdit, onUndoEarlyOpen, onRemove }} />}
      />
      <p className="text-[13px] text-fg2">
        {formatLabel} · Match {matchNo} · {minutes} min
        {substitutions > 0
          ? ` · ${substitutions} substitution${substitutions > 1 ? 's' : ''}`
          : null}
      </p>
      {onOpenMatch ? (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={onOpenMatch}>
            Open match
          </Button>
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
  formatLabel,
  matchNo,
  blockedReason,
  onStartMatch,
  onOpenMatch,
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
      className={cn(courtCardVariants({ variant: 'on-court', merged }), className)}
    >
      <MatchCourtHead
        {...{ label, untilLabel, startLabel, bookingEnded, openedEarly, merged }}
        {...{ teamA, teamB, onOpenProfile }}
        chip={<Chip>{merged ? 'Merged · Getting ready' : 'Getting ready'}</Chip>}
        menu={
          <CourtMenu
            busy
            {...{ label, onSwap, swapWith, onChangeLabel, onEdit, onUndoEarlyOpen, onRemove }}
          />
        }
      />
      <p className="text-[13px] text-fg2">
        {formatLabel} · Match {matchNo} · waiting to start
      </p>
      {blockedReason ? (
        <span className="flex items-start gap-1.5 text-[13px] text-warn">
          <Icon name="alert" className="mt-0.5 flex-none" />
          {blockedReason}
        </span>
      ) : null}
      {onStartMatch || onOpenMatch ? (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {onStartMatch ? (
            <Button
              size="sm"
              variant="primary"
              onClick={onStartMatch}
              disabled={!!blockedReason}
              title={blockedReason}
            >
              Start match
            </Button>
          ) : null}
          {onOpenMatch ? (
            <Button size="sm" onClick={onOpenMatch}>
              Open match
            </Button>
          ) : null}
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
    <article aria-label={label} className={cn(courtCardVariants({ variant: 'free' }), className)}>
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
      <CourtDrawing free freeLabel={removed ? 'Removed' : notOpen ? 'Not open yet' : 'Free'} />
      {removed ? (
        <p className="text-[13px] text-fg2">Manually removed from this session.</p>
      ) : notOpen ? (
        <>
          <p className="text-[13px] text-fg2">
            Opens at {startLabel}. The court is unavailable before this time.
          </p>
          {onStartAnyway ? (
            <div className="mt-auto flex flex-wrap items-center gap-2">
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
            {listNames(next.teamA)} <span className="text-fg2">vs</span> {listNames(next.teamB)}
          </p>
          {onPlace || onPickAnother ? (
            <div className="mt-auto flex flex-wrap items-center gap-2">
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
            <div className="mt-auto flex flex-wrap items-center gap-2">
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
