import { z } from 'zod'

/** Accepts a required trimmed name; 60-character (prototype full-name limit) maximum is a placeholder pending a product rule. */
export const nameField = z.string().trim().min(1, 'Enter a name.').max(60)

/** The shortest and longest full name the club can give a profile it made (prototype: 2–60). */
export const FULL_NAME_MIN = 2
export const FULL_NAME_MAX = 60

/** Shown when a full name is empty or one character (Edit player, the server save). */
export const FULL_NAME_TOO_SHORT_MESSAGE = 'Enter the full name, at least 2 characters.'
export const FULL_NAME_TOO_LONG_MESSAGE = `Keep the full name to ${FULL_NAME_MAX} characters or fewer.`

/** Collapses runs of whitespace to one space and trims the ends (the mockup's saveEditLive rule). */
export function normalizeFullName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * The full name the club edits on a profile it made (unclaimed or guest): spaces collapsed, then
 * 2–60 characters. Output is the normalized name. Shared by the Edit player sheet and the server.
 */
export const fullNameSchema = z
  .string()
  .transform(normalizeFullName)
  .pipe(
    z
      .string()
      .min(FULL_NAME_MIN, FULL_NAME_TOO_SHORT_MESSAGE)
      .max(FULL_NAME_MAX, FULL_NAME_TOO_LONG_MESSAGE),
  )
