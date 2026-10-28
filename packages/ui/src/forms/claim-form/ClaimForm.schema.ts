import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { personalDetailsShape } from '@rotra/schema/personal-details'
import { socialLinksShape } from '@rotra/schema/social-link'
import { z } from 'zod'
/** Email and password plus the optional personal details. The phone is never a form field here. */
export const claimSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email.')
      .refine(
        (value) => !value || emailField.safeParse(value).success,
        'Enter an email address, like name@example.com.',
      ),
    password: z.string().min(1, 'Choose a password.').pipe(passwordField),
    confirmPassword: z.string(),
    ...personalDetailsShape,
    ...socialLinksShape,
  })
  .refine((values) => !values.password || values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "The two passwords don't match.",
  })
export type ClaimValues = z.infer<typeof claimSchema>
