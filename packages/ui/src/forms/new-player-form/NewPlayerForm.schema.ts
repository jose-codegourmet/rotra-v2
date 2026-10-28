import type { PlayingLevel } from '@rotra/data/player/types'
import { nameField } from '@rotra/schema/name'
import { phoneField } from '@rotra/schema/phone'
import { LEVEL_OPTION_GROUPS } from '@rotra/ui/level-select'
import { z } from 'zod'

export const NICKNAME_MAX = 40
export const LEVEL_ERROR = 'Choose a level for this club.'

const LEVEL_VALUES = new Set<string>(
  LEVEL_OPTION_GROUPS.flatMap((group) => group.options.map((option) => option.value)),
)

/** Optional PH mobile as typed: empty stays null; otherwise the shared phoneField's E.164 form. */
const optionalPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const parsed = phoneField.safeParse(value)
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        message: parsed.error.issues[0]?.message ?? 'Enter a Philippine mobile number.',
      })
      return z.NEVER
    }
    return parsed.data
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
 * Q-ADD-PLAYER › New player: a required name, optional nickname and phone, and the level for this
 * club. No phone means the player is saved as a guest; a phone makes profile lookup possible on sync.
 */
export const newPlayerSchema = z.object({
  name: nameField,
  nickname: z
    .string()
    .trim()
    .max(NICKNAME_MAX)
    .transform((value) => value || null),
  phone: optionalPhone,
  level: requiredLevel,
})

/** What the fields hold while typing (phone as typed, level '' until chosen). */
export type NewPlayerFormInput = z.input<typeof newPlayerSchema>
/** What onSubmit receives (nickname and phone null when empty, phone in E.164, level required). */
export type NewPlayerFormValues = z.output<typeof newPlayerSchema>
