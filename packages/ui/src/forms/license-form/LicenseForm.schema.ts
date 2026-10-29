import type { ClubLicenseTerm } from '@rotra/data/license/types'
import { parseWholePesos } from '@rotra/schema/club-price'
import { dateField } from '@rotra/schema/date'
import { z } from 'zod'

export type LicensePlan = ClubLicenseTerm['plan']
export const LICENSE_PLANS = ['Monthly', 'Yearly'] as const satisfies readonly LicensePlan[]
export const LICENSE_REFERENCE_MAX = 40

const isYmd = (value: string) => dateField.safeParse(value).success

export type LicenseSchemaOptions = {
  /** A free (tester) club records no payment date or amount; the term is recorded at ₱0 */
  isFree: boolean
  /** 'YYYY-MM-DD'; the payment date can't be after it */
  today: string
}

/**
 * A-LICENSE details step (rotra-admin.html licErrors). Paid clubs need the date paid (not in the
 * future) and a whole amount in pesos above zero (moneyField via parseWholePesos); free clubs skip both.
 * The reference stays optional.
 */
export function createLicenseSchema({ isFree, today }: LicenseSchemaOptions) {
  const paidOn = isFree
    ? z.string()
    : z
        .string()
        .refine(isYmd, 'Enter the date the club paid.')
        .refine((value) => !isYmd(value) || value <= today, "The payment date can't be in the future.")
  const amount = isFree
    ? z.string()
    : z
        .string()
        .refine(
          (value) => parseWholePesos(value) !== null,
          'Enter the amount the club paid, in pesos.',
        )
  return z
    .object({
      plan: z.string().pipe(z.enum(LICENSE_PLANS, { error: 'Choose monthly or yearly.' })),
      startsOn: z.string().refine(isYmd, 'Enter the date the term starts.'),
      paidOn,
      amount,
      reference: z
        .string()
        .trim()
        .max(LICENSE_REFERENCE_MAX, 'Keep the reference under 40 characters.'),
    })
    .transform(({ plan, startsOn, paidOn, amount, reference }) => ({
      plan,
      startsOn,
      /** null for a free club: nothing was paid */
      paidOn: isFree ? null : paidOn,
      /** Integer centavos; 0 for a free club */
      amountMinor: isFree ? 0 : (parseWholePesos(amount) ?? 0),
      reference,
    }))
}

/** What the fields hold while typing: plan '' until chosen, dates 'YYYY-MM-DD' or '', amount as peso text. */
export type LicenseFormInput = z.input<ReturnType<typeof createLicenseSchema>>
/** What onSubmit receives: the plan, the term start, the payment (null / 0 when free) and the reference. */
export type LicenseFormValues = z.output<ReturnType<typeof createLicenseSchema>>
