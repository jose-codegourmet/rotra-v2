import { z } from 'zod'

/** Accepts PH mobiles starting 09, 639 or +639, with spaces/hyphens; parses to E.164. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d -]+$/, 'Enter a Philippine mobile number.')
  .transform((value) => value.replace(/[ -]/g, ''))
  .pipe(z.string().regex(/^(?:0|\+?63)9\d{9}$/, 'Enter a Philippine mobile number.'))
  .transform((value) =>
    value.startsWith('0') ? `+63${value.slice(1)}` : `+${value.replace(/^\+/, '')}`,
  )

/** Groups complete or partially typed PH mobiles for display only; preserves other input unchanged. */
export function formatPhoneForDisplay(value: string): string {
  const compact = value.replace(/[ -]/g, '')
  if (!/^(?:0\d{0,10}|\+?63\d{0,10})$/.test(compact)) return value
  if (compact.startsWith('0')) {
    return [compact.slice(0, 4), compact.slice(4, 7), compact.slice(7)].filter(Boolean).join(' ')
  }
  const digits = compact.replace(/^\+/, '').slice(2)
  return ['+63', digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(' ')
}

/**
 * Masks a phone for display: '+639185550377' (or 0918 555 0377, 63 918 555 0377) → '+63 918 ••• ••77'.
 * Enough for the person to recognise, not to reuse. Input with no digits is returned unchanged.
 */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (!digits) return value
  if (/^0\d{10}$/.test(digits)) digits = `63${digits.slice(1)}`
  const country = digits.length > 10 ? digits.slice(0, digits.length - 10) : digits.slice(0, 2)
  const rest = digits.slice(country.length)
  return `+${country} ${rest.slice(0, 3)} ••• ••${rest.slice(-2)}`
}
