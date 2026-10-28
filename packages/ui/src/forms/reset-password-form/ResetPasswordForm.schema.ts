import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'
export const resetPasswordSchema = z.object({ password: z.string().min(1, 'Enter a new password.').pipe(passwordField), confirmPassword: z.string() }).refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: "The two passwords don't match." })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
