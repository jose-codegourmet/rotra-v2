import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'

// Players sign in with their email only (owner decision 2026-11-08); a phone number is not a login.
export const signInSchema = z.object({ email: emailField, password: passwordField })
export type SignInValues = z.infer<typeof signInSchema>
