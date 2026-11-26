import type { PlayingLevel } from '@rotra/data/player/types'
import { emailField } from '@rotra/schema/email'
import { genderField } from '@rotra/schema/gender'
import { nameField } from '@rotra/schema/name'
import { phoneField } from '@rotra/schema/phone'
import { normalizeSocialLink, SOCIAL_LINK_ERROR } from '@rotra/schema/social-link'
import { LEVEL_OPTION_GROUPS } from '@rotra/ui/level-select'
import { z } from 'zod'

export const NICKNAME_MAX = 40
export const LEVEL_ERROR = 'Choose a level for this club.'

const LEVEL_VALUES = new Set<string>(
  LEVEL_OPTION_GROUPS.flatMap((group) => group.options.map((option) => option.value)),
)

export const EMAIL_ERROR = 'Enter an email address, like name@example.com, or leave it empty.'

/** Optional email as typed: empty stays null; otherwise the shared emailField's trimmed address. */
const optionalEmail = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const parsed = emailField.safeParse(value)
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: EMAIL_ERROR })
      return z.NEVER
    }
    return parsed.data
  })

/**
 * #1019: optional social link as typed: empty stays null; otherwise a Facebook, Instagram, YouTube
 * or LinkedIn profile link, trimmed (normalizing for matching happens where it is saved).
 */
const optionalSocialLink = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const link = normalizeSocialLink(value)
    if (!link) {
      ctx.addIssue({ code: 'custom', message: SOCIAL_LINK_ERROR })
      return z.NEVER
    }
    return link.url
  })

export const PHONE_ERROR =
  'Enter a Philippine mobile number, like 0917 555 0142, or leave it empty.'
export const PHONE_NEEDS_KEY_ERROR =
  'Add an email or a social link to save a phone, or leave the phone empty.'

/** Optional phone as typed: empty stays null; otherwise E.164 (+639…) from the shared phoneField. */
const optionalPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const parsed = phoneField.safeParse(value)
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: PHONE_ERROR })
      return z.NEVER
    }
    return parsed.data
  })

/** A phone is kept for an unclaimed player only: a guest (no email, no link) has none. */
const phoneNeedsKey = (
  values: { phone: string | null; email: string | null; socialLink: string | null },
  ctx: z.RefinementCtx,
) => {
  if (values.phone && !values.email && !values.socialLink)
    ctx.addIssue({ code: 'custom', path: ['phone'], message: PHONE_NEEDS_KEY_ERROR })
}

/** The level select holds '' until chosen; one of the nine playing levels is required. */
const requiredLevel = z.string().transform((value, ctx) => {
  if (!LEVEL_VALUES.has(value)) {
    ctx.addIssue({ code: 'custom', message: LEVEL_ERROR })
    return z.NEVER
  }
  return value as PlayingLevel
})

/**
 * Q-ADD-PLAYER › New player: a required name, optional nickname, email and social link, and the
 * level for this club. With neither an email nor a social link the player is saved as a guest;
 * either one saves an unclaimed player with an RTR ID (D-2026-11-16-04, #1019).
 */
const newPlayerFields = {
  name: nameField,
  nickname: z
    .string()
    .trim()
    .max(NICKNAME_MAX)
    .transform((value) => value || null),
  /** Optional: '' while not given, saved as null */
  gender: genderField,
  email: optionalEmail,
  socialLink: optionalSocialLink,
  phone: optionalPhone,
  level: requiredLevel,
}

export const newPlayerSchema = z.object(newPlayerFields).superRefine(phoneNeedsKey)

/**
 * Saved players › Add player (no session): the same fields with the level optional. An empty level
 * saves the player with no level yet.
 */
export const newSavedPlayerSchema = z
  .object({
    ...newPlayerFields,
    level: z.string().transform((value, ctx) => {
      if (value === '') return null
      if (!LEVEL_VALUES.has(value)) {
        ctx.addIssue({ code: 'custom', message: LEVEL_ERROR })
        return z.NEVER
      }
      return value as PlayingLevel
    }),
  })
  .superRefine(phoneNeedsKey)

/** What onSubmit receives in the club context: the level is null when left empty. */
export type NewSavedPlayerFormValues = z.output<typeof newSavedPlayerSchema>

/** What the fields hold while typing (email as typed, level '' until chosen). */
export type NewPlayerFormInput = z.input<typeof newPlayerSchema>
/** What onSubmit receives (nickname and email null when empty, level required). */
export type NewPlayerFormValues = z.output<typeof newPlayerSchema>
