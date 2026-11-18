import { adminPlayerReasonField } from '@rotra/schema/admin-player'
import { z } from 'zod'

export const adminVerificationOverrideSchema = z.object({ reason: adminPlayerReasonField })
export type AdminVerificationOverrideValues = z.infer<typeof adminVerificationOverrideSchema>
