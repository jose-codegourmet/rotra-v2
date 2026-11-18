import type {
  AccountVerification,
  AdminAccountVerification,
  SetAdminVerificationOverrideInput,
} from '../account-verification/accountVerification.types'
import { ConflictError, MockError } from '../mock/errors'
import { RealRequestError, realRequest } from './client'

type WireAdminVerification = AccountVerification & { revision: string }
const adminPath = (id: string) => `/api/players/${encodeURIComponent(id)}/verification`
const adminVerificationOf = (wire: WireAdminVerification): AdminAccountVerification => ({
  ...wire,
  revision: Number(wire.revision),
})

export async function realGetMyAccountVerification(playerId: string, signal?: AbortSignal) {
  try {
    const { verification } = await realRequest<{ verification: AccountVerification | null }>(
      '/api/me/verification',
      { signal },
    )
    // The session can change while a query for the previous player's cache key is in flight.
    return verification?.playerId === playerId ? verification : null
  } catch (error) {
    if (error instanceof RealRequestError && (error.status === 401 || error.status === 403))
      return null
    throw error
  }
}

export async function realGetAdminAccountVerification(playerId: string, signal?: AbortSignal) {
  const { verification } = await realRequest<{ verification: WireAdminVerification | null }>(
    adminPath(playerId),
    { signal },
  )
  return verification ? adminVerificationOf(verification) : null
}

export async function realSetAdminVerificationOverride(input: SetAdminVerificationOverrideInput) {
  const { playerId, verifiedByAdmin, revision, reason } = input
  try {
    const { verification } = await realRequest<{ verification: WireAdminVerification }>(
      adminPath(playerId),
      { method: 'PATCH', body: { verifiedByAdmin, revision: String(revision), reason } },
    )
    return adminVerificationOf(verification)
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 422)
      throw new MockError('conflict', error.message, error.fieldErrors)
    if (!(error instanceof RealRequestError) || error.status !== 409) throw error
    const current = await realGetAdminAccountVerification(playerId)
    if (!current)
      throw new MockError('permission', 'Verification is available only for registered players.')
    throw new ConflictError(current, error.message)
  }
}
