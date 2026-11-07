import { moneyField } from '@rotra/schema/money'
import { z } from 'zod'

export const PAYMENT_AMOUNT_ERROR = 'Enter the amount received, 0 or more.'

/** #479 · the amount received from one player: peso text → integer centavos, 0 or more. */
export const paymentAmountFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const parsed = moneyField.safeParse(value)
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: PAYMENT_AMOUNT_ERROR })
        return z.NEVER
      }
      return parsed.data
    }),
})

/** What the field holds while typing (peso text). */
export type PaymentAmountFormInput = z.input<typeof paymentAmountFormSchema>
/** What onSubmit receives: the amount received in integer centavos. */
export type PaymentAmountFormValues = z.output<typeof paymentAmountFormSchema>
