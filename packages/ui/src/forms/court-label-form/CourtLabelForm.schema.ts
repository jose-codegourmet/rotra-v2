import { courtLabelField } from '@rotra/schema/court-label'
import { z } from 'zod'

/**
 * Change court label: one Court label field, required, up to 20 characters. Another court may
 * have the same label (owner decision, 2026-11-25).
 */
export function makeCourtLabelSchema() {
  return z.object({ label: courtLabelField() })
}

export type CourtLabelFormInput = z.input<ReturnType<typeof makeCourtLabelSchema>>
/** What onSubmit receives: the trimmed new label. */
export type CourtLabelFormValues = z.output<ReturnType<typeof makeCourtLabelSchema>>
