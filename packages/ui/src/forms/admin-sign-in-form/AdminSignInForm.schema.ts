import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'

// Sign-in accepts existing passwords; new-password length rules must never be applied here.
export const adminSignInSchema = z.object({ email: emailField, password: passwordField })
export type AdminSignInValues = z.infer<typeof adminSignInSchema>
