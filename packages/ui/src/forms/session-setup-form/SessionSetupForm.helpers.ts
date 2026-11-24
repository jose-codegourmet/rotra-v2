import { clockTimeFrom, courtTimeOnSession, instantOnDate } from '@rotra/schema/court-window'
import { SCORING, type ScoringKey } from '@rotra/schema/scoring'
import type { SessionSetupInput } from './SessionSetupForm.schema'

const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutes between the start and end times; an end at or before the start means the next day. */
export function durationMinutes(values: Pick<SessionSetupInput, 'startTime' | 'endTime'>): number {
  const d = (minutesOf(values.endTime) - minutesOf(values.startTime) + 1440) % 1440
  return d || 1440
}

export function isOvernight(values: Pick<SessionSetupInput, 'startTime' | 'endTime'>): boolean {
  return minutesOf(values.endTime) <= minutesOf(values.startTime)
}

/** "3 h", "2 h 30 min" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h${m ? ` ${m} min` : ''}`
}

/**
 * The Total duration box: "4 HR", "1 HR 30 MIN", "45 MIN", or "—" while the end is invalid (null).
 * The prototype's durLabel().
 */
export function formatDurationLabel(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} HR` : '', m ? `${m} MIN` : ''].filter(Boolean).join(' ') || '0 MIN'
}

/** "7:00 PM": a court's planned time on its setup picture (the prototype's fmtTime()). */
export function formatCourtTime(instant: number): string {
  return new Date(instant).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Setup values as full instants: the one place the clock-only time fields become instants until
 * the date-and-time picker (Q12.24) sends each day. The start is on the session date; the end and
 * each court time are the first such clock time from the start (the end strictly after it, so at
 * most 24 h later). An empty court start is the session start; an empty court end (null) follows
 * the session end. Validation then works on these instants only.
 */
export function sessionTimes(
  values: Pick<SessionSetupInput, 'date' | 'startTime' | 'endTime'> &
    Partial<Pick<SessionSetupInput, 'courtLabels' | 'courtStarts' | 'courtEnds'>>,
) {
  const start = instantOnDate(values.date, values.startTime)
  const end = clockTimeFrom(start + 60_000, values.endTime)
  const courts = (values.courtLabels ?? []).map((_, i) => {
    const from = values.courtStarts?.[i]
    const until = values.courtEnds?.[i]
    return {
      startsAt: from ? courtTimeOnSession(start, clockTimeFrom(start, from)) : start,
      openUntil: until ? clockTimeFrom(start, until) : null,
    }
  })
  return { start, end, courts }
}

/** The "HH:mm" a clock-only setup field holds for a picked instant. */
export function clockOf(instant: number): string {
  const date = new Date(instant)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** The calendar days a time field can fall on (the day of each bound), for the pickers. */
export function sessionDays(from: number, to: number): number[] {
  return Number.isFinite(from) && Number.isFinite(to) ? [from, to] : []
}

export function slotBudget(values: Pick<SessionSetupInput, 'courtLabels' | 'playersPerCourt'>) {
  return values.courtLabels.length * values.playersPerCourt
}

/** "Singles + Doubles", "Doubles", or "No standard format" */
export function formatsLabel(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return (
    [values.allowSingles && 'Singles', values.allowDoubles && 'Doubles']
      .filter(Boolean)
      .join(' + ') || 'No standard format'
  )
}

/** "mixed doubles and singles", "singles", "doubles" */
export function formatMixLabel(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return values.allowDoubles && values.allowSingles
    ? 'mixed doubles and singles'
    : values.allowSingles
      ? 'singles'
      : 'doubles'
}

/** Players on court per game: doubles 4, singles 2, both 10/3 (about two doubles to one singles) */
export function playersPerGame(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return values.allowDoubles && values.allowSingles ? 10 / 3 : values.allowSingles ? 2 : 4
}

/** What a form submit does on a page: the last page saves, every earlier page acts as Next. */
export function setupSubmitAction(page: number, last: number): 'next' | 'save' {
  return page >= last ? 'save' : 'next'
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image'])

/** Whether Enter in this element is a browser implicit submission (text-like inputs only). */
export function isEnterSubmitTarget(el: { tagName: string; type?: string } | null): boolean {
  if (!el || el.tagName !== 'INPUT') return false
  return !NON_TEXT_INPUTS.has((el.type || 'text').toLowerCase())
}

export const MODE_OPTIONS = [
  { value: 'chill', label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  { value: 'fair', label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  { value: 'hard', label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
] as const

export const REPEAT_LABEL = {
  none: 'Does not repeat',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
} as const

/** The Record games hint under the switch (and read-only chip): on counts wins toward the ROTRA leaderboards, off is not ranked. */
export function recordGamesHint(recordGames: boolean, locked = false): string {
  const base = recordGames
    ? 'Results, standings, result slides and awards are kept, and wins count toward the ROTRA leaderboards and win rate.'
    : "Games and results are recorded as usual, but wins don't count toward the ROTRA leaderboards or anyone's win rate."
  return locked ? `${base} Record games can't change after Start.` : base
}

/** The Record games row on the review, the Setup card and the Start session sheet. */
export function recordGamesLabel(recordGames: boolean): string {
  return recordGames ? 'On' : 'Off · not ranked'
}

/** Which illustration each Mode and Scoring card shows: image URLs the app supplies (apps/queue/public/art). */
export type SetupCardArtKey = 'chill' | 'fair' | 'hard' | 'p31' | 'p21' | 'p21x3'
export type SetupCardArt = Partial<Record<SetupCardArtKey, string>>

/**
 * The three Scoring points cards. Each maps to the scoring keys: `on` with deuce, `off` without
 * (null: One game to 21 has no no-deuce mode).
 */
export const SCORING_POINTS: readonly {
  k: 'p31' | 'p21' | 'p21x3'
  label: string
  text: string
  on: ScoringKey
  off: ScoringKey | null
}[] = [
  { k: 'p31', label: '31 points', text: 'One game · change sides at 16', on: '31', off: '31nd' },
  { k: 'p21', label: '21 points', text: 'One game · change sides at 11', on: '21', off: null },
  { k: 'p21x3', label: '21 × 3', text: 'Best of 3 games to 21', on: '21x3', off: '21x3nd' },
]

/** The points card a scoring key belongs to. */
export const pointsOf = (key: ScoringKey) =>
  SCORING_POINTS.find((p) => p.on === key || p.off === key) ??
  (SCORING_POINTS[0] as (typeof SCORING_POINTS)[number])

/** The key for a points card: Deuce kept when the card has both modes, otherwise its only one. */
export const scoringKeyFor = (
  points: (typeof SCORING_POINTS)[number],
  deuce: boolean,
): ScoringKey => (deuce || !points.off ? points.on : points.off)

/** The Deuce row's line under its name. */
export function deuceHint(key: ScoringKey): string {
  const { target, deuce } = SCORING[key]
  if (!pointsOf(key).off) return 'One game to 21 always plays deuce at 20–20.'
  return deuce ? `Deuce at ${target - 1}–${target - 1}.` : `No deuce: the first to ${target} wins.`
}

/** The Scoring hint under the field; locked once the session has started. */
export const SCORING_HINT =
  'How games are scored tonight. The match result dialog asks only for what this needs.'
export const SCORING_LOCKED_HINT = "Scoring can't change after Start."
