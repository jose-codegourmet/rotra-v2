import { cn } from '@rotra/ui/cn'
import type { ReactNode, Ref } from 'react'

export type SetupCourtPictureProps = {
  /** The court's label, drawn on the court: "Court 1" */
  label: string
  /** Players budgeted for this court (the "Players per court" count) */
  players: number
  /** Planned start as display text. Empty means "Session start" */
  plannedStart?: string
  /** Planned end as display text. Empty means "Session end" */
  plannedEnd?: string
  /** The court has a time error: error border and caption */
  invalid?: boolean
  /** Id of the error message shown under the pictures */
  errorId?: string
  /** Opens the Edit Court dialog */
  onPress: () => void
  /** The button, so the parent can return focus to it when the dialog closes */
  ref?: Ref<HTMLButtonElement>
  id?: string
  className?: string
}

/** The prototype's setupCourtSVG(): a doubles court, 13.4 m × 6.1 m in decimetres. */
function CourtSvg() {
  return (
    <svg
      viewBox="0 0 134 61"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="block h-auto w-full rounded-[6px] [--court-c:var(--color-court)] [--court-l:var(--color-court-line)]"
    >
      <rect width="134" height="61" rx="3" fill="var(--court-c)" />
      <g fill="none" stroke="var(--court-l)" strokeWidth="1" strokeLinecap="square">
        <rect x="1" y="1" width="132" height="59" />
        <path d="M1 4.6H133M1 56.4H133M47.2 1V60M86.8 1V60M7.6 1V60M126.4 1V60M1 30.5H47.2M86.8 30.5H133" />
      </g>
      <path d="M67 -1V62" stroke="var(--court-l)" strokeWidth="2" strokeDasharray="2 1.5" />
    </svg>
  )
}

/**
 * One booked court in Session setup step 1: a top-down court with its label on it, and under it the
 * budgeted players and planned times. The whole tile is a button that opens Edit Court N.
 * The prototype's .sc-tile (setupCourtSVG(), .sc-name, .sc-cap).
 */
export function SetupCourtPicture({
  label,
  players,
  plannedStart,
  plannedEnd,
  invalid = false,
  errorId,
  onPress,
  ref,
  id,
  className,
}: SetupCourtPictureProps) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      onClick={onPress}
      aria-haspopup="dialog"
      aria-label={`${label}: ${plannedStart || 'session start'} to ${plannedEnd || 'session end'}. Edit this court`}
      aria-describedby={invalid ? errorId : undefined}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-2 rounded-lg border bg-surface p-2 text-left font-[inherit] text-fg',
        invalid ? 'border-error' : 'border-border hover:border-border-strong',
        className,
      )}
    >
      <span className="relative block">
        <CourtSvg />
        <span className="absolute top-1/2 left-1/2 max-w-[80%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full bg-scrim px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap text-on-photo">
          {label}
        </span>
      </span>
      <span
        className={cn(
          'flex flex-wrap justify-between gap-2 px-0.5 text-xs',
          invalid ? 'text-error' : 'text-fg2',
        )}
      >
        <b className={invalid ? 'text-error' : 'text-fg'}>
          {players} {players === 1 ? 'player' : 'players'}
        </b>
        <span>
          {plannedStart || 'Session start'} – {plannedEnd || 'Session end'}
        </span>
      </span>
    </button>
  )
}

/** The prototype's .sc-tiles: one picture per row on a phone, as many columns as fit (230 px minimum). */
export function SetupCourtPictureGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <fieldset
      aria-label="Courts"
      className={cn(
        'm-0 grid min-w-0 border-0 p-0 grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-3',
        className,
      )}
    >
      {children}
    </fieldset>
  )
}
