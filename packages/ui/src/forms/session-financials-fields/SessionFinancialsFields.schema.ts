import { optionalMoneyField } from '@rotra/schema/money'
import { z } from 'zod'

export const CUSTOM_FEE_ERROR = 'Enter the amount per player, or switch to break-even.'
export const sessionFinancialsSchema = z.object({
  courtFeePerCourtHour: optionalMoneyField,
  entranceFeePerHead: optionalMoneyField,
  shuttles: z.array(z.object({
    inventoryItemId: z.string(),
    tubes: z.union([z.literal(''), z.number().int().nonnegative('Use a whole number, 0 or more.')]).transform((value) => value === '' ? 0 : value),
  })),
  paymentMode: z.enum(['break_even', 'custom']),
  customFeePerHead: optionalMoneyField,
}).superRefine((values, ctx) => {
  if (values.paymentMode === 'custom' && values.customFeePerHead === null)
    ctx.addIssue({ code: 'custom', message: CUSTOM_FEE_ERROR, path: ['customFeePerHead'] })
})

export type SessionFinancialsInput = z.input<typeof sessionFinancialsSchema>
export type SessionFinancialsValues = z.output<typeof sessionFinancialsSchema>
