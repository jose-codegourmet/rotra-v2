import type { CourtLabelFormInput } from './CourtLabelForm.schema'

/** Prefilled with the court's current label. */
export function courtLabelDefaultValues(currentLabel: string): CourtLabelFormInput {
  return { label: currentLabel }
}
