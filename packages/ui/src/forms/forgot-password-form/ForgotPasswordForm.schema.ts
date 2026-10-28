import { emailField } from '@rotra/schema/email'
import { z } from 'zod'
export const forgotPasswordSchema = z.object({ email: z.string().trim().refine((value) => emailField.safeParse(value).success, 'Enter an email address, like name@example.com.') })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
