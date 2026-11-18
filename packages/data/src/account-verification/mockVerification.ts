import type { MockState } from '../mock/store'
import { deriveAccountVerification } from './accountVerification.rules'

export function accountVerificationIn(state: MockState, playerId: string) {
  const account = state.playerAccounts.find((entry) => entry.playerId === playerId && entry.claimed)
  if (!account) return null

  return deriveAccountVerification(
    account,
    state.contactChangeRequests,
    state.adminPlayerRecords[playerId]?.verificationOverride?.status === 'verified',
  )
}

export function adminAccountVerificationIn(state: MockState, playerId: string) {
  if (!state.players.some((entry) => entry.id === playerId)) return null
  const verification = accountVerificationIn(state, playerId)
  if (!verification) return null

  return { ...verification, revision: state.adminPlayerRecords[playerId]?.revision ?? 1 }
}
