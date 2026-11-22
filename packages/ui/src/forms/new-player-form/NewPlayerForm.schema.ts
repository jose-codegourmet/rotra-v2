import type { PlayingLevel } from '@rotra/data/player/types'
import { emailField } from '@rotra/schema/email'
import { nameField } from '@rotra/schema/name'
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
export const newPlayerSchema = z.object({
  name: nameField,
  nickname: z
    .string()
    .trim()
    .max(NICKNAME_MAX)
    .transform((value) => value || null),
  email: optionalEmail,
  socialLink: optionalSocialLink,
  level: requiredLevel,
})

/**
 * Saved players › Add player (no session): the same fields with the level optional. An empty level
 * saves the player with no level yet.
 */
export const newSavedPlayerSchema = newPlayerSchema.extend({
  level: z.string().transform((value, ctx) => {
    if (value === '') return null
    if (!LEVEL_VALUES.has(value)) {
      ctx.addIssue({ code: 'custom', message: LEVEL_ERROR })
      return z.NEVER
    }
    return value as PlayingLevel
  }),
})

/** What onSubmit receives in the club context: the level is null when left empty. */
export type NewSavedPlayerFormValues = z.output<typeof newSavedPlayerSchema>

/** What the fields hold while typing (email as typed, level '' until chosen). */
export type NewPlayerFormInput = z.input<typeof newPlayerSchema>
/** What onSubmit receives (nickname and email null when empty, level required). */
export type NewPlayerFormValues = z.output<typeof newPlayerSchema>
