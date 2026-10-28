import { timeField } from '@rotra/schema/date'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { z } from 'zod'

export const COURT_LABEL_MAX = 40
export const CLOSING_TIME_ERROR = 'Choose a closing time.'
export const AFTER_NOW_ERROR = 'Choose a time later than now.'
export const afterSessionEndError = (sessionEndsAt: number) =>
  `That's after the session ends at ${formatTime(sessionEndsAt)}. Pick an earlier time, or extend the session first.`

export type OpenUntilMode = 'end' | 'time'

/**
 * A "HH:mm" time placed on the session's day. Earlier than the session start means the next day
 * (overnight sessions), as the prototype's timeOnSession() does.
 */
export function timeOnSession(sessionStartsAt: number, hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  const date = new Date(sessionStartsAt)
  date.setHours(h, m, 0, 0)
  let at = date.getTime()
  if (at < sessionStartsAt) at += 864e5
  return at
}

export type AddCourtSchemaOptions = {
  /** The current time; a set time must be later than this */
  now: number
  /** The session's start: set times are placed on this day (or the next, overnight) */
  sessionStartsAt: number
  /** The session's scheduled end: a set time may not be after it */
  sessionEndsAt: number
  /** The next "Court N", used when the label is left empty (as the prototype does) */
  fallbackLabel: string
}

/**
 * Q-ADD-COURT: a court label (the next "Court N" when empty) and when the court closes: with the
 * session (openUntil null) or at a set time on the session's day, later than now and not after the
 * session end.
 */
export function makeAddCourtSchema({
  now,
  sessionStartsAt,
  sessionEndsAt,
  fallbackLabel,
}: AddCourtSchemaOptions) {
  return z
    .object({
      label: z
        .string()
        .trim()
        .max(COURT_LABEL_MAX)
        .transform((value) => value || fallbackLabel),
      mode: z.enum(['end', 'time']),
      /** "HH:mm"; only read when mode is "time" */
      time: z.string(),
    })
    .transform((values, ctx) => {
      if (values.mode === 'end') return { label: values.label, openUntil: null }
      if (!values.time || !timeField.safeParse(values.time).success) {
        ctx.addIssue({ code: 'custom', message: CLOSING_TIME_ERROR, path: ['time'] })
        return z.NEVER
      }
      const openUntil = timeOnSession(sessionStartsAt, values.time)
      if (openUntil <= now) {
        ctx.addIssue({ code: 'custom', message: AFTER_NOW_ERROR, path: ['time'] })
        return z.NEVER
      }
      if (openUntil > sessionEndsAt) {
        ctx.addIssue({
          code: 'custom',
          message: afterSessionEndError(sessionEndsAt),
          path: ['time'],
        })
        return z.NEVER
      }
      return { label: values.label, openUntil }
    })
}

/** What the fields hold while typing */
export type AddCourtFormInput = z.input<ReturnType<typeof makeAddCourtSchema>>
/** What onSubmit receives: the label and openUntil (null = until the session ends), as useAddCourt takes */
export type AddCourtFormValues = z.output<ReturnType<typeof makeAddCourtSchema>>
