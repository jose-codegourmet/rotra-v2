import { z } from 'zod'

/** Accepts a real calendar date in YYYY-MM-DD form; returns the unchanged date string. */
export const dateField = z.iso.date()

/** Accepts { start, end } calendar dates; requires end strictly after start without timezone conversion. */
export const dateRangeField = z
  .object({ start: dateField, end: dateField })
  .refine(({ start, end }) => end > start, {
    message: 'End date must be after start date.',
    path: ['end'],
  })

/** Accepts a 24-hour HH:mm time (00:00–23:59); returns it unchanged. */
export const timeField = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time.')
