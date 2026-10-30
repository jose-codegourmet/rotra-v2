import { plainText } from '@rotra/ui/forms/add-club-form/schema'
import { z } from 'zod'

export const FLAG_NAME_MAX = 50
export const FLAG_KEY_MAX = 40
export const FLAG_DESCRIPTION_MIN = 10
/** 3 to 40 lowercase letters, numbers and underscores, starting with a letter (feature_flags key). */
export const FLAG_KEY_PATTERN = /^[a-z][a-z0-9_]{2,39}$/

/**
 * rotra-admin.html flagKeyOf(): the name without accents, lowercased, every run of other characters
 * as one underscore, no leading or trailing underscores, "f_" before a leading digit, at most 40.
 */
export function suggestFlagKey(name: string) {
  return plainText(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'f_$1')
    .slice(0, FLAG_KEY_MAX)
}

export type AddFlagSchemaOptions = {
  /** Every existing flag name; a match ignoring case and accents is refused */
  takenNames?: string[]
  /** Every existing flag key */
  takenKeys?: string[]
}

/** A-ADD-FLAG: a flag's name, its fixed key, what it does and its starting value (rotra-admin.html flagErrors). */
export function createAddFlagSchema({
  takenNames = [],
  takenKeys = [],
}: AddFlagSchemaOptions = {}) {
  const names = new Set(takenNames.map((name) => plainText(name.trim())))
  const keys = new Set(takenKeys)
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter a name.')
      .max(FLAG_NAME_MAX, 'Keep the name under 50 characters.')
      .refine((name) => !names.has(plainText(name)), 'A flag with this name already exists.'),
    key: z
      .string()
      .trim()
      .min(1, 'Enter a key.')
      .regex(
        FLAG_KEY_PATTERN,
        'Use 3 to 40 lowercase letters, numbers and underscores, starting with a letter.',
      )
      .refine((key) => !keys.has(key), 'That key is already used.'),
    description: z
      .string()
      .trim()
      .min(FLAG_DESCRIPTION_MIN, 'Describe what the flag does, so it is clear when to use it.'),
    on: z.boolean(),
  })
}

/** What the fields hold while typing. */
export type AddFlagFormInput = z.input<ReturnType<typeof createAddFlagSchema>>
/** What onSubmit receives: trimmed text and the starting value. */
export type AddFlagFormValues = z.output<ReturnType<typeof createAddFlagSchema>>
