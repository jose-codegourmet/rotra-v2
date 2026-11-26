import { z } from 'zod'

/** The two genders a club can give; not given is null (D-2026-11-19-01). */
export const GENDERS = ['male', 'female'] as const

/**
 * Gender as the Add player and Edit details forms hold it: '' while not given, otherwise male or
 * female. Optional, so '' is always valid.
 */
export const genderInput = z.enum(['male', 'female', ''])

/** The same field as submitted by Add player: '' becomes null. */
export const genderField = genderInput.transform((value) => (value === '' ? null : value))

/**
 * Gender as the registration's Your details step holds it: '' until a chip is picked, then male or
 * female. Required (D-2026-11-19-01, owner comment of November 19, 2026), so '' fails.
 */
export const genderRequiredInput = z
  .enum(['male', 'female', ''])
  .refine((value) => value.length > 0, 'Choose Male or Female.')
