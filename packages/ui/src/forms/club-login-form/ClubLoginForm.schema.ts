import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'

/** Shown once for any missing field: the prototype uses one notice, not per-field errors. */
export const CLUB_LOGIN_REQUIRED = 'Enter your club username and password.'

export const clubLoginSchema = z.object({
  username: z.string().trim().min(1, CLUB_LOGIN_REQUIRED),
  password: passwordField,
})

export type ClubLoginValues = z.infer<typeof clubLoginSchema>
