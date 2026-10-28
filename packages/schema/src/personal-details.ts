import { z } from 'zod'
import { socialLinksShape } from './social-link'

// Field limits and the free-text playing style are prototype placeholders: field-length limits and
// playing-style fields are open decisions ('Profile editing' in the business and screen open-decisions).

/**
 * Accepts the player's required full name, trimmed, at most 60 characters. Same limit as nameField,
 * with the prototype's player-facing messages (nameField's own messages would be reported first).
 */
export const fullNameField = z
  .string()
  .trim()
  .min(1, 'Enter your full name.')
  .max(60, 'Keep your name to 60 characters or fewer.')

/** Accepts an optional nickname, trimmed, at most 24 characters (prototype limit); empty stays empty. */
export const nicknameField = z
  .string()
  .trim()
  .max(24, 'Keep your nickname to 24 characters or fewer.')

/** Accepts optional free-text playing style, trimmed, at most 280 characters (prototype limit). */
export const playingStyleField = z.string().trim().max(280)

/** Optional whole number as typed; '' or digits within [0, max], kept as the typed string. */
function wholeNumberText(max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => !value || (/^\d+$/.test(value) && Number(value) <= max), { message })
}

/** Accepts optional self-reported years of experience as typed: blank or a whole number 0–80. */
export const experienceYearsField = wholeNumberText(80, 'Enter whole years from 0 to 80.')

/** Accepts optional extra months of experience as typed: blank or a whole number 0–11. */
export const experienceMonthsField = wholeNumberText(11, 'Enter months from 0 to 11.')

/** The personal fields shared by Edit profile and the registration claim form. Only fullName is required. */
export const personalDetailsShape = {
  fullName: fullNameField,
  nickname: nicknameField,
  playingStyle: playingStyleField,
  experienceYears: experienceYearsField,
  experienceMonths: experienceMonthsField,
}

/**
 * Everything a player may change about their own profile: the personal fields plus the four links.
 * Strict, so phone, email, the RTR ID or rank sent alongside are rejected rather than ignored.
 */
export const personalProfileSchema = z
  .object({ ...personalDetailsShape, ...socialLinksShape })
  .strict()
export type PersonalProfileValues = z.infer<typeof personalProfileSchema>
