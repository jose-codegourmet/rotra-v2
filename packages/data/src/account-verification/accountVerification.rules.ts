import { maskPhone } from '@rotra/schema/phone'
import type { ContactChangeRequest } from '../contact-change-request/contactChangeRequest.types'
import { normalizeGoogleEmail } from '../google-sign-in/googleSignIn.rules'
import type { MyAccount } from '../player-account/playerAccount.types'
import type { AccountVerification, VerificationEmail } from './accountVerification.types'

type VerificationRequest = Pick<ContactChangeRequest, 'playerId' | 'field' | 'status' | 'toValue'>
type VerificationAccount = Pick<MyAccount, 'playerId' | 'googleEmail' | 'email' | 'phone'>

function emailCheck(
  account: VerificationAccount,
  googleEmail: string | null,
  requests: readonly VerificationRequest[],
): VerificationEmail {
  if (!googleEmail) return { kind: 'google_missing' }
  const rotraEmail = normalizeGoogleEmail(account.email)
  if (rotraEmail === googleEmail) return { kind: 'match', rotraEmail, googleEmail }

  const pendingEmailRequest = requests.some(
    (request) =>
      request.playerId === account.playerId &&
      request.field === 'email' &&
      (request.status === 'pending' ||
        request.status === 'approved' ||
        request.status === 'applying') &&
      normalizeGoogleEmail(request.toValue) === googleEmail,
  )
  return { kind: 'mismatch', rotraEmail, googleEmail, pendingEmailRequest }
}

/** The three checks are independent of the Admin override, so Admin can still inspect them. */
export function deriveAccountVerification(
  account: VerificationAccount,
  requests: readonly VerificationRequest[],
  verifiedByAdmin: boolean,
): AccountVerification {
  const googleEmail = normalizeGoogleEmail(account.googleEmail ?? '') || null
  const phone = account.phone.trim()
  const email = emailCheck(account, googleEmail, requests)
  const checks = [Boolean(googleEmail), Boolean(phone), email.kind === 'match']
  const completedSteps = checks.filter(Boolean).length as AccountVerification['completedSteps']

  return {
    playerId: account.playerId,
    verified: verifiedByAdmin || completedSteps === 3,
    verifiedByAdmin,
    completedSteps,
    googleEmail,
    maskedPhone: phone ? maskPhone(phone) : null,
    email,
  }
}
