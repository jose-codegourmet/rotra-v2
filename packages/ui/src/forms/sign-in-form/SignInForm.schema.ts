import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { phoneField } from '@rotra/schema/phone'
import { z } from 'zod'
export const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your phone number or email.')
    .superRefine((value, context) => {
      if (value && !phoneField.safeParse(value).success && !emailField.safeParse(value).success)
        context.addIssue({
          code: 'custom',
          message: 'Enter a Philippine mobile number or email address.',
        })
    })
    .transform((value) => {
      const phone = phoneField.safeParse(value)
      return phone.success ? phone.data : value.toLowerCase()
    }),
  password: passwordField,
})
export type SignInValues = z.infer<typeof signInSchema>
