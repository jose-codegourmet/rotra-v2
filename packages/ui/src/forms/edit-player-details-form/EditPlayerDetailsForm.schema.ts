import { emailField } from '@rotra/schema/email'
import { personalDetailsShape } from '@rotra/schema/personal-details'
import { phoneField } from '@rotra/schema/phone'
import { socialLinksShape } from '@rotra/schema/social-link'
import { z } from 'zod'

/**
 * Queue › Edit details. Same personal fields as registration, plus a phone (only typed when none is
 * on file) and the email that will prefill the player's registration. Everything but the name is
 * optional.
 */
export const editPlayerDetailsSchema = z.object({
  ...personalDetailsShape,
  ...socialLinksShape,
  phone: z
    .string()
    .refine(
      (value) => !value.trim() || phoneField.safeParse(value).success,
      'Enter a Philippine mobile number, like 0917 555 0142.',
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || emailField.safeParse(value).success,
      'Enter an email address, like name@example.com.',
    ),
})
export type EditPlayerDetailsValues = z.infer<typeof editPlayerDetailsSchema>
