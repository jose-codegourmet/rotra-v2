import { z } from 'zod'

/**
 * Accepts a nonempty password unchanged (including whitespace).
 * Placeholder: required-only, matching the prototype. Complexity/minimum length await the auth spec.
 */
export const passwordField = z.string().min(1, 'Enter your password.')
