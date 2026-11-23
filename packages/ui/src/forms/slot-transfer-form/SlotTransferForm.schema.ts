import { isRtrId, normalizeRtrId } from '@rotra/data/player/rtr-id'
import { TRANSFER_RTR_ID_ERROR } from '@rotra/data/slot-transfer/slotTransfer.rules'
import { z } from 'zod'

/**
 * Transfer my slot (#1011): one field, the recipient's full RTR ID, trimmed and upper-cased. Names
 * are never searched; the server finds the registered player by the exact RTR ID.
 */
export const slotTransferSchema = z.object({
  rtrId: z
    .string()
    .trim()
    .min(1, TRANSFER_RTR_ID_ERROR)
    .refine(isRtrId, TRANSFER_RTR_ID_ERROR)
    .transform(normalizeRtrId),
})

export type SlotTransferFormInput = z.input<typeof slotTransferSchema>
/** What onFind and onSubmit receive: the normalized RTR ID */
export type SlotTransferFormValues = z.output<typeof slotTransferSchema>
