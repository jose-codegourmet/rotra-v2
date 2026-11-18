import type { GoogleRequirementState } from './googleSignIn.types'

/** Google emails compare without case or stray spaces. */
export const normalizeGoogleEmail = (email: string) => email.trim().toLowerCase()

/** The deadline day ends at midnight in the Philippines (UTC+8), after the whole day has passed. */
export function isGoogleDeadlinePassed(date: string, now = Date.now()) {
  return now >= Date.parse(`${date}T00:00:00+08:00`) + 86_400_000
}

/** `connected` with a Google email on the account; otherwise `nudge` before the deadline, `required` after. */
export function googleRequirementState(
  googleEmail: string | null | undefined,
  passed: boolean,
): GoogleRequirementState {
  if (googleEmail) return 'connected'
  return passed ? 'required' : 'nudge'
}

/** The nickname, or the first word of the full name, as the invite card and welcome use it. */
export const shortPlayerName = (fullName: string, nickname: string | null) =>
  nickname || fullName.split(' ')[0] || fullName
