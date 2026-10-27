import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'

export const PASSWORD_MIN = 8

export const changePasswordSchema = z
  .object({
    current: passwordField,
    next: z.string().min(PASSWORD_MIN, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.next !== v.current, {
    message: 'Choose a password different from your current one.',
    path: ['next'],
  })
  .refine((v) => v.confirm === v.next, { message: "Passwords don't match.", path: ['confirm'] })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
