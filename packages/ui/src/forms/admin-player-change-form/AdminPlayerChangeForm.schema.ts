import { z } from 'zod'
export const adminPlayerChangeSchema = z.object({
  reason: z.string().trim().min(1),
  confirmations: z.record(z.string(), z.string()),
})
