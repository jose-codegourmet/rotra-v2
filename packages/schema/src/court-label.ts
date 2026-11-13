import { z } from 'zod'

/** A court label: required, up to 20 characters (Change court label, Q-ADD-COURT). */
export const COURT_LABEL_MAX = 20
export const COURT_LABEL_REQUIRED = 'Enter a court label.'
export const COURT_LABEL_TOO_LONG = `Use ${COURT_LABEL_MAX} characters or fewer.`
export const COURT_LABEL_TAKEN = 'Another court already has this label.'

/** Why a typed label can't be saved, or null: required, ≤ 20 characters, unique in the session (any case). */
export function courtLabelError(label: string, otherLabels: string[]) {
  const value = label.trim()
  if (!value) return COURT_LABEL_REQUIRED
  if (value.length > COURT_LABEL_MAX) return COURT_LABEL_TOO_LONG
  if (otherLabels.some((other) => other.trim().toLowerCase() === value.toLowerCase()))
    return COURT_LABEL_TAKEN
  return null
}

/** The label field: trimmed, checked with courtLabelError against the session's other courts. */
export function courtLabelField(otherLabels: string[]) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const error = courtLabelError(value, otherLabels)
      if (error) ctx.addIssue({ code: 'custom', message: error })
    })
}
