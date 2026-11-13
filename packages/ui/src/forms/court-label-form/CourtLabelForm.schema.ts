import { courtLabelField } from '@rotra/schema/court-label'
import { z } from 'zod'

/**
 * Change court label: one Court label field, required, up to 20 characters and unique within the
 * session (any case). `otherLabels` are the session's other courts' labels.
 */
export function makeCourtLabelSchema(otherLabels: string[]) {
  return z.object({ label: courtLabelField(otherLabels) })
}

export type CourtLabelFormInput = z.input<ReturnType<typeof makeCourtLabelSchema>>
/** What onSubmit receives: the trimmed new label. */
export type CourtLabelFormValues = z.output<ReturnType<typeof makeCourtLabelSchema>>
