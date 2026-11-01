import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { OverflowMenu, type OverflowMenuItem } from '@rotra/ui/overflow-menu'
import { courtCardVariants } from './CourtCard.variants'

type CourtCardBase = {
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  label: string
  /** The court's closing time, already formatted: "9:00 PM" */
  untilLabel: string
  startLabel?: string
  bookingEnded?: boolean
  /** Opened before its planned start (Start anyway): the time line reads "Opened early · planned START – UNTIL" */
  openedEarly?: boolean
  /** ⋯ menu: Edit the court's label and window */
  onEdit?: () => void
  /** ⋯ menu: Undo early open, back to Not open yet; disabled on an in-game card */
  onUndoEarlyOpen?: () => void
  className?: string
}

export type CourtCardInGameProps = CourtCardBase & {
  variant: 'in-game'
  /** A 5v5 on two courts: two stacked courts, "Merged · in game" */
  merged?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  onOpenProfile?: (playerId: string) => void
  /** "Doubles", "5v5 fun" */
  formatLabel: string
  matchNo: number
  /** Minutes since the match started */
  minutes: number
  substitutions?: number
  /** Renders "Open match" when given */
  onOpenMatch?: () => void
  /** ⋯ menu: Remove, disabled here with "Only a free court can be removed" */
  onRemove?: () => void
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
  /** Past its closing time: "Booking ended HH:MM" in warn; the game continues */
  bookingEnded?: boolean
  notOpen?: boolean
  removed?: boolean
  /** The session's last court: Remove is disabled with "A session needs at least one court" */
  isLastCourt?: boolean
  /** ⋯ menu: Remove */
  onRemove?: () => void
  /** Not open yet: renders "Start anyway" (the owner confirms, then opens the court early) */
  onStartAnyway?: () => void
  /** A ready match; when missing the body says why none can start, or that the queue is empty */
  next?: CourtCardNextMatch | null
  /** Why no waiting match can start (the first match's reason); omit when the queue is empty */
  blockedReason?: string
  /** Renders "Review and start" when given */
  onReviewAndStart?: () => void
  /** Renders "Pick another"; pass it only when more than one match waits */
  onPickAnother?: () => void
  /** Renders "Add match" when given */
  onAddMatch?: () => void
}

export type CourtCardProps = CourtCardInGameProps | CourtCardFreeProps

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

/** Edit, Undo early open and Remove; the card itself keeps only the action for its state. */
function CourtMenu({
  label,
  busy,
  isLastCourt = false,
  onEdit,
  onUndoEarlyOpen,
  onRemove,
}: {
  label: string
  busy: boolean
  isLastCourt?: boolean
  onEdit?: () => void
  onUndoEarlyOpen?: () => void
  onRemove?: () => void
}) {
  const items: OverflowMenuItem[] = []
  if (onEdit) items.push({ label: 'Edit', onSelect: onEdit })
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

/** Prototype listNames(): "Mikee and Dexter", "Mikee, Dexter and Jose" */
function listNames(names: string[]) {
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * One court in the live console: in game (teams on a court drawing, match line, Open match) or free
 * (empty drawing, the next eligible match or why none can start, Remove). The prototypes' .court.
 */
export function CourtCard(props: CourtCardProps) {
  if (props.variant === 'in-game') return <InGameCourtCard {...props} />
  return <FreeCourtCard {...props} />
}

function InGameCourtCard({
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{label}</h3>
          <TimeLine {...{ startLabel, untilLabel, bookingEnded, openedEarly }} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          <Chip tone="accent">{merged ? 'Merged · in game' : 'In game'}</Chip>
          <CourtMenu busy {...{ label, onEdit, onUndoEarlyOpen, onRemove }} />
        </div>
      </div>
      <CourtDrawing
        courts={merged ? 2 : 1}
        teamA={teamA}
        teamB={teamB}
        onOpenProfile={onOpenProfile}
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

function FreeCourtCard({
  label,
  untilLabel,
  startLabel,
  bookingEnded = false,
  notOpen = false,
  removed = false,
  isLastCourt = false,
  onRemove,
  onStartAnyway,
  openedEarly = false,
  onEdit,
  onUndoEarlyOpen,
  next,
  blockedReason,
  onReviewAndStart,
  onPickAnother,
  onAddMatch,
  className,
}: CourtCardFreeProps) {
  return (
    <article aria-label={label} className={cn(courtCardVariants({ variant: 'free' }), className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{label}</h3>
          <TimeLine {...{ startLabel, untilLabel, bookingEnded, openedEarly }} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          <Chip>{removed ? 'Removed' : notOpen ? 'Not open yet' : 'Free'}</Chip>
          {removed ? null : (
            <CourtMenu
              busy={false}
              {...{ label, isLastCourt, onEdit, onUndoEarlyOpen, onRemove }}
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
          {onReviewAndStart || onPickAnother ? (
            <div className="mt-auto flex flex-wrap items-center gap-2">
              {onReviewAndStart ? (
                <Button size="sm" variant="primary" onClick={onReviewAndStart}>
                  Review and start
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
            {blockedReason
              ? `No waiting match can start: ${blockedReason}.`
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
