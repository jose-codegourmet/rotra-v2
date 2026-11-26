import { z } from 'zod'

/**
 * A court label: required, up to 20 characters (Change court label, Q-ADD-COURT). Two courts in a
 * session may share a label (owner decision, 2026-11-25).
 */
export const COURT_LABEL_MAX = 20
export const COURT_LABEL_REQUIRED = 'Enter a court label.'
export const COURT_LABEL_TOO_LONG = `Use ${COURT_LABEL_MAX} characters or fewer.`

/** Why a typed label can't be saved, or null: required, ≤ 20 characters. */
export function courtLabelError(label: string) {
  const value = label.trim()
  if (!value) return COURT_LABEL_REQUIRED
  if (value.length > COURT_LABEL_MAX) return COURT_LABEL_TOO_LONG
  return null
}

/** The label field: trimmed, checked with courtLabelError. */
export function courtLabelField() {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const error = courtLabelError(value)
      if (error) ctx.addIssue({ code: 'custom', message: error })
    })
}
