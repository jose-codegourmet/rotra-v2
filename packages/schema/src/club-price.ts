import { z } from 'zod'
import { formatPeso, moneyField } from './money'

export const MONTHLY_PRICE_ERROR = 'Enter the monthly price in pesos.'
export const YEARLY_PRICE_ERROR = 'Enter the yearly price in pesos.'

/** The yearly-discount message: names twelve months at the monthly price (centavos in). */
export const yearlyDiscountError = (monthlyMinor: number) =>
  `Make it less than 12 months at the monthly price (${formatPeso(monthlyMinor * 12)}). Yearly plans get a discount.`

/**
 * Peso text (or centavos) → integer centavos when it is a whole peso amount above zero, else null.
 * Built on moneyField, so "1,500" and "1500.00" both give 150000; "1500.50", "0" and "" give null.
 */
export function parseWholePesos(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const parsed = moneyField.safeParse(value)
  return parsed.success && parsed.data > 0 && parsed.data % 100 === 0 ? parsed.data : null
}

/** rotra-admin.html savePct(): whole-percent saving of the yearly price over twelve months. */
export function yearlySavingPercent(monthlyMinor: number, yearlyMinor: number): number {
  return Math.round((1 - yearlyMinor / (monthlyMinor * 12)) * 100)
}

/** A stored club price: integer centavos; a free club keeps its last paid amounts (or 0 if it never had one). */
export type StoredClubPrice = {
  pricing: 'paid' | 'free'
  monthlyMinor: number
  yearlyMinor: number
}

/**
 * rotra-admin.html priceLine(): "₱1,500 a month · ₱15,000 a year (17% off)", or "Free (tester club)".
 * The one implementation; @rotra/data club rules and the @rotra/ui price helpers both call it.
 */
export function formatClubPriceLine(price: StoredClubPrice): string {
  if (price.pricing === 'free') return 'Free (tester club)'
  const saving = yearlySavingPercent(price.monthlyMinor, price.yearlyMinor)
  return `${formatPeso(price.monthlyMinor)} a month · ${formatPeso(price.yearlyMinor)} a year${saving > 0 ? ` (${saving}% off)` : ''}`
}

const wholePesoField = (message: string) =>
  z.string().transform((value, ctx) => {
    const minor = parseWholePesos(value)
    if (minor === null) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return minor
  })

/** Free keeps whatever was typed for Paid; valid whole pesos survive as centavos, anything else null. */
const keptPesoField = z
  .string()
  .optional()
  .transform((value) => parseWholePesos(value))

/**
 * A club's own license price (no fixed price). Accepts { pricing, monthly, yearly } with the amounts
 * as peso text. 'paid': both whole pesos above zero → integer centavos, and yearly must be less than
 * 12 × monthly (the yearly discount). 'free' (tester clubs, licenses recorded at ₱0): the last paid
 * amounts stay optional → centavos or null, so switching back to Paid can start from them.
 */
export const clubPriceField = z.discriminatedUnion('pricing', [
  z
    .object({
      pricing: z.literal('paid'),
      monthly: wholePesoField(MONTHLY_PRICE_ERROR),
      yearly: wholePesoField(YEARLY_PRICE_ERROR),
    })
    .superRefine((price, ctx) => {
      if (price.yearly >= price.monthly * 12)
        ctx.addIssue({
          code: 'custom',
          message: yearlyDiscountError(price.monthly),
          path: ['yearly'],
        })
    }),
  z.object({ pricing: z.literal('free'), monthly: keptPesoField, yearly: keptPesoField }),
])

/** What the price fields hold while typing (amounts as peso text). */
export type ClubPriceInput = z.input<typeof clubPriceField>
/** The parsed price: integer centavos (paid), or the kept centavos / null (free). */
export type ClubPriceValues = z.output<typeof clubPriceField>
