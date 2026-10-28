import { optionalMoneyField } from '@rotra/schema/money'
import { z } from 'zod'

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Give the item a name.'),
  category: z.enum(['shuttlecocks', 'equipment', 'other']),
  unit: z.string().trim().transform((value) => value || 'piece'),
  stock: z.string().trim().refine((value) => value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 'Use a whole number, 0 or more.').transform((value) => Number(value || 0)),
  unitCostMinor: optionalMoneyField.transform((value) => value ?? 0).refine((value) => value % 100 === 0, 'Use a whole peso amount, 0 or more.'),
})
export type InventoryItemFormInput = z.input<typeof inventoryItemSchema>
export type InventoryItemFormValues = z.output<typeof inventoryItemSchema>
