import type { SessionJoinRequest } from '@rotra/data/session-roster/types'
import { nameField } from '@rotra/schema/name'
import { phoneField } from '@rotra/schema/phone'
import { z } from 'zod'

export const NICKNAME_MAX = 40
export const NAME_ERROR = 'Enter your name.'
export const PHONE_ERROR = 'Enter a full mobile number, or leave it empty.'
export const BAND_ERROR = 'Pick your level, or Not sure.'

export type StatedBand = SessionJoinRequest['statedBand']

/** The prototype's BAND_CHOICES, in order; the values are session_join_requests.stated_band. */
export const BAND_CHOICES: { value: StatedBand; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'unsure', label: 'Not sure' },
]

const BAND_VALUES = new Set<string>(BAND_CHOICES.map((choice) => choice.value))

/** Optional PH mobile as typed: empty stays null; otherwise the shared phoneField's E.164 form. */
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

/** The level choice holds '' until picked; one of the four bands (Not sure included) is required. */
const requiredBand = z.string().transform((value, ctx) => {
  if (!BAND_VALUES.has(value)) {
    ctx.addIssue({ code: 'custom', message: BAND_ERROR })
    return z.NEVER
  }
  return value as StatedBand
})

/**
 * Q-PUBLIC-JOIN › Request to join: a required name, optional nickname and phone, and the guest's
 * self-declared level. A request is not a booking; the Queue Master sets the level for the night.
 */
export const joinRequestSchema = z.object({
  // The shared name rule with the public page's wording for an empty name.
  name: z.string().trim().min(1, NAME_ERROR).pipe(nameField),
  nickname: z
    .string()
    .trim()
    .max(NICKNAME_MAX)
    .transform((value) => value || null),
  phone: optionalPhone,
  statedBand: requiredBand,
})

/** What the fields hold while typing (phone as typed, statedBand '' until picked). */
export type JoinRequestFormInput = z.input<typeof joinRequestSchema>
/** What onSubmit receives (nickname and phone null when empty, phone in E.164, statedBand required). */
export type JoinRequestFormValues = z.output<typeof joinRequestSchema>
