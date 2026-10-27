import { z } from 'zod'

/** Accepts an email address; trims surrounding whitespace without provider-specific transforms. */
export const emailField = z.string().trim().pipe(z.email())
