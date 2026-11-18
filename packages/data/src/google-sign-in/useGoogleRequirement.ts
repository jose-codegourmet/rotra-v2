'use client'
import type { MyAccount } from '../player-account/playerAccount.types'
import { googleRequirementState } from './googleSignIn.rules'
import type { GoogleRequirement } from './googleSignIn.types'
import { useGoogleDeadline } from './useGoogleDeadline'
import { useRemindMeLater } from './useRemindMeLater'

/**
 * Where the signed-in player stands on Google (P-GOOGLE-REQUIRED, the announcement band). Pass the
 * player's own account (`useMyAccount`); `null` while it loads or signed out. `required` is the
 * password-only player after the deadline: send them to P-GOOGLE-REQUIRED. Unknown (no account or
 * deadline yet) reads `connected`, so nothing redirects before the facts are in.
 */
export function useGoogleRequirement(
  account: Pick<MyAccount, 'googleEmail'> | null | undefined,
): GoogleRequirement {
  const deadline = useGoogleDeadline().data
  const { reminded } = useRemindMeLater()
  const state =
    account && deadline ? googleRequirementState(account.googleEmail, deadline.passed) : 'connected'
  return {
    state,
    deadline,
    canRemindLater: state === 'nudge',
    reminded: state === 'nudge' && reminded,
  }
}
