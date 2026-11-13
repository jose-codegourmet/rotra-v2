import {
  clockTimeFrom,
  courtAfterSessionEndError,
  courtTimeOnSession,
  courtWindowError,
} from '@rotra/schema/court-window'
import { COURT_LABEL_MAX, COURT_LABEL_TOO_LONG } from '@rotra/schema/court-label'
import { timeField } from '@rotra/schema/date'
import { z } from 'zod'

export const CLOSING_TIME_ERROR = 'Choose a closing time.'
export const afterSessionEndError = courtAfterSessionEndError

export type OpenUntilMode = 'end' | 'time'

/**
 * The time field's "HH:mm" as a full instant: the first such clock time from the session start
 * (a time in the start's own minute is the start itself). The clock-only bridge until the
 * date-and-time picker (Q12.24) sends the day; validation below works on instants only.
 */
export function timeOnSession(sessionStartsAt: number, hhmm: string): number {
  return courtTimeOnSession(sessionStartsAt, clockTimeFrom(sessionStartsAt, hhmm))
}

export type AddCourtSchemaOptions = {
  /** The session's start (actual once live): the earliest planned start; set times count from it */
  sessionStartsAt: number
  /** The session's scheduled end: a set time may not be after it */
  sessionEndsAt: number
  /** The next "Court N", used when the label is left empty (as the prototype does) */
  fallbackLabel: string
  lockedStartsAt?: number
}

/**
 * Q-ADD-COURT: a court label (the next "Court N" when empty) and when the court closes: with the
 * session (openUntil null) or at a set time on the session's day, after the planned start and within the session. A passed planned end remains advisory.
 */
export function makeAddCourtSchema({
  sessionStartsAt,
  sessionEndsAt,
  fallbackLabel,
  lockedStartsAt,
}: AddCourtSchemaOptions) {
  return z
    .object({
      label: z
        .string()
        .trim()
        .max(COURT_LABEL_MAX, COURT_LABEL_TOO_LONG)
        .transform((value) => value || fallbackLabel),
      startTime: z.string().default(''),
      mode: z.enum(['end', 'time']),
      /** "HH:mm"; only read when mode is "time" */
      time: z.string(),
    })
    .transform((values, ctx) => {
      if (values.startTime && !timeField.safeParse(values.startTime).success) {
        ctx.addIssue({ code: 'custom', message: 'Choose a planned start.', path: ['startTime'] })
        return z.NEVER
      }
      if (values.mode === 'time' && !timeField.safeParse(values.time).success) {
        ctx.addIssue({ code: 'custom', message: CLOSING_TIME_ERROR, path: ['time'] })
        return z.NEVER
      }
      const typedStart = values.startTime
        ? timeOnSession(sessionStartsAt, values.startTime)
        : sessionStartsAt
      const openUntil = values.mode === 'end' ? null : timeOnSession(sessionStartsAt, values.time)
      if (
        lockedStartsAt !== undefined &&
        Math.floor(typedStart / 60000) !== Math.floor(lockedStartsAt / 60000)
      ) {
        ctx.addIssue({ code: 'custom', message: 'Start is fixed after use.', path: ['startTime'] })
        return z.NEVER
      }
      const startsAt = lockedStartsAt ?? typedStart
      const error = courtWindowError(startsAt, openUntil, sessionStartsAt, sessionEndsAt)
      if (error) {
        ctx.addIssue({
          code: 'custom',
          message: error,
          path: [
            (openUntil ?? sessionEndsAt) <= sessionEndsAt &&
            (startsAt < sessionStartsAt || startsAt >= sessionEndsAt)
              ? 'startTime'
              : 'time',
          ],
        })
        return z.NEVER
      }
      return { label: values.label, startsAt, openUntil }
    })
}

export type AddCourtFormInput = z.input<ReturnType<typeof makeAddCourtSchema>>
export type AddCourtFormValues = z.output<ReturnType<typeof makeAddCourtSchema>>
