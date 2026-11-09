import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { personalDetailsShape } from '@rotra/schema/personal-details'
import { phoneField } from '@rotra/schema/phone'
import { socialLinksShape } from '@rotra/schema/social-link'
import { z } from 'zod'
/**
 * Email and password plus the optional personal details. `phone` is only filled in when the profile
 * has no phone on file (the form then requires it); a phone on file is shown read-only instead.
 */
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
    phone: z
      .string()
      .refine(
        (value) => !value.trim() || phoneField.safeParse(value).success,
        'Enter a Philippine mobile number, like 0917 555 0142.',
      ),
    password: z.string().min(1, 'Choose a password.').pipe(passwordField),
    confirmPassword: z.string(),
    cityCode: z.string().optional(),
    ...personalDetailsShape,
    ...socialLinksShape,
  })
  .refine((values) => !values.password || values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "The two passwords don't match.",
  })
export type ClaimValues = z.infer<typeof claimSchema>
