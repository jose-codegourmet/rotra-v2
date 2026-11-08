import { z } from 'zod'
import { emailField } from './email'
import { passwordField } from './password'
import { personalDetailsShape } from './personal-details'
import { phoneField } from './phone'
import { socialLinksShape } from './social-link'

/** Guest registration input: required unique contacts and existing personal-detail rules. */
export const registrationSchema = z.object({
  ...personalDetailsShape,
  ...socialLinksShape,
  email: emailField.transform((value) => value.toLowerCase()),
  phone: phoneField,
  password: passwordField,
})
export type RegistrationValues = z.infer<typeof registrationSchema>

/** A random retry secret; it never identifies or authorizes linking a club guest. */
export const registrationRequestSchema = z.object({
  attempt: z.string().regex(/^[a-f0-9]{64}$/),
  values: registrationSchema,
})
