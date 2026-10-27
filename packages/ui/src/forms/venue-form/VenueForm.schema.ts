import { moneyField } from '@rotra/schema/money'
import { z } from 'zod'

export const VENUE_NAME_MAX = 80
export const VENUE_ADDRESS_MAX = 160
export const FEE_ERROR = 'Use 0 or more, or leave it empty.'
export const DUPLICATE_NAME_ERROR = 'You already have a venue with this name.'

/** Optional peso amount as typed: empty stays null (not 0); otherwise integer centavos. */
const optionalFee = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const parsed = moneyField.safeParse(value)
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: FEE_ERROR })
      return z.NEVER
    }
    return parsed.data
  })

/**
 * Venue name, address and fees. Pass the club's other venue names to reject duplicates
 * (case-insensitive), as the prototype does.
 */
export function venueSchema(existingNames: string[] = []) {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give the venue a name.')
      .max(VENUE_NAME_MAX)
      .refine((name) => !taken.has(name.toLowerCase()), DUPLICATE_NAME_ERROR),
    address: z
      .string()
      .trim()
      .max(VENUE_ADDRESS_MAX)
      .transform((value) => value || null),
    courtFee: optionalFee,
    entranceFee: optionalFee,
  })
}

/** What the fields hold while typing (fees as peso text). */
export type VenueFormInput = z.input<ReturnType<typeof venueSchema>>
/** What onSubmit receives (fees as integer centavos or null, empty address as null). */
export type VenueFormValues = z.output<ReturnType<typeof venueSchema>>
