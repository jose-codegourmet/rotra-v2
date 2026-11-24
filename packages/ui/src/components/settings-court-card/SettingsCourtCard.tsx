'use client'

import { Checkbox } from '@rotra/ui/checkbox'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { FreeCourtChip } from '@rotra/ui/court-card'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { startOfDay } from '@rotra/ui/date-time-picker/helpers'
import { toast } from '@rotra/ui/toaster'
import { DAY_MS, opensBeforeClosesError, whenText } from './SettingsCourtCard.helpers'

export type SettingsCourtState = 'free' | 'getting-ready' | 'playing' | 'not-open'

export type SettingsCourtCardProps = {
  /** "Court 1" */
  label: string
  state: SettingsCourtState
  /** The match's teams while the court is Getting ready or Playing */
  teamA?: CourtPlayer[]
  teamB?: CourtPlayer[]
  /** The court's opening time, epoch ms (its planned start) */
  from: number
  /** The court's closing time, epoch ms: its own end, or the session end while it follows it */
  until: number
  /** The session's planned end, epoch ms: picking it as Until ticks Follows session end */
  sessionEnd: number
  /** The court has no end of its own (openUntil is null) */
  followsSessionEnd: boolean
  /** Saves a new opening time. Only called for a From before Until; the card toasts "COURT opens TIME". */
  onChangeFrom: (from: number) => void
  /** Saves the court's own end time. The card toasts "COURT open until TIME". */
  onChangeUntil: (until: number) => void
  /** Clears the court's own end: it follows the session end again. The card toasts "COURT follows the session end". */
  onFollowSessionEnd: () => void
  className?: string
}

const GLOW =
  'border-accent shadow-[0_0_0_1px_var(--color-accent),0_0_12px_2px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]'

// The picker's time button stops at 260 px by default; here it fills the column to the card's edge.
const FIELD = '[&_button]:max-w-none'

function StateChip({ state }: { state: SettingsCourtState }) {
  if (state === 'playing') return <Chip tone="accent">Playing</Chip>
  if (state === 'getting-ready') return <Chip>Getting ready</Chip>
  if (state === 'not-open') return <Chip>Not open yet</Chip>
  return <FreeCourtChip />
}

/**
 * One small court card in the Settings Courts box (the prototype's .ls-cc): label and status chip,
 * the court drawing (grey "FREE" when no match is on it, accent border and glow while Playing), then
 * From and Until time fields that open the time dialog and a "Follows session end" checkbox. Every
 * change saves at once. Until is always editable: a time other than the session end unticks the box,
 * the session end ticks it.
 */
export function SettingsCourtCard({
  label,
  state,
  teamA = [],
  teamB = [],
  from,
  until,
  sessionEnd,
  followsSessionEnd,
  onChangeFrom,
  onChangeUntil,
  onFollowSessionEnd,
  className,
}: SettingsCourtCardProps) {
  const hasMatch = state === 'playing' || state === 'getting-ready'
  const invalidFrom = from >= until
  const nextDay = startOfDay(until) !== startOfDay(from)

  const changeFrom = (next: number | null) => {
    if (next == null || next === from) return
    if (next >= until) {
      toast.error(opensBeforeClosesError(label))
      return
    }
    onChangeFrom(next)
    toast(`${label} opens ${whenText(next, next)}`)
  }

  const changeUntil = (next: number | null) => {
    if (next == null || next === until) return
    if (next <= from || next > from + DAY_MS) {
      toast.error(opensBeforeClosesError(label))
      return
    }
    if (next === sessionEnd) {
      onFollowSessionEnd()
      toast(`${label} follows the session end`)
      return
    }
    onChangeUntil(next)
    toast(`${label} open until ${whenText(next, from)}`)
  }

  const toggleFollow = (checked: boolean) => {
    if (checked) {
      onFollowSessionEnd()
      toast(`${label} follows the session end`)
    } else {
      onChangeUntil(until)
      toast(`${label} has its own end time`)
    }
  }

  return (
    <article
      aria-label={label}
      className={cn(
        'flex min-w-0 flex-col gap-2.5 rounded-lg border border-border-strong bg-bg p-3',
        state === 'playing' && GLOW,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="min-w-0 truncate">{label}</b>
        <StateChip state={state} />
      </div>
      <CourtDrawing free={!hasMatch} freeLabel="FREE" teamA={teamA} teamB={teamB} />
      <div className="grid grid-cols-1 gap-1.5">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
          <span aria-hidden className="text-[13px] text-fg2">
            From
          </span>
          <DateTimePicker
            className={FIELD}
            label={`${label} opens`}
            value={from}
            days={[from]}
            max={until - 1}
            invalid={invalidFrom}
            onChange={changeFrom}
          />
        </div>
        {invalidFrom ? (
          <p role="alert" className="text-[13px] text-error">
            {opensBeforeClosesError(label)}
          </p>
        ) : null}
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
          <span aria-hidden className="text-[13px] text-fg2">
            Until
          </span>
          <DateTimePicker
            className={FIELD}
            label={`${label} open until`}
            value={until}
            days={[from, from + DAY_MS]}
            base={from}
            min={from + 1}
            max={from + DAY_MS}
            nextDaySwitch
            suffix={nextDay ? 'next day' : undefined}
            onChange={changeUntil}
          />
        </div>
      </div>
      <Checkbox
        label="Follows session end"
        checked={followsSessionEnd}
        onChange={toggleFollow}
        className="border-0 p-0"
      />
    </article>
  )
}
