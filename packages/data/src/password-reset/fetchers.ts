import { getAdminSession, requireAdminOnline } from '../admin-account/fetchers'
import { adminMutation } from '../admin-account/mutation'
import { MockError } from '../mock/errors'
import { mockStore, readMockState } from '../mock/store'
import { realRequest } from '../real/client'
import { isRealDataMode } from '../real/mode'
import type { PasswordResetRequestList, ReviewPasswordResetInput } from './passwordReset.types'

export function submitMockPasswordReset(email: string) {
  mockStore.update((draft) => {
    const address = email.trim().toLowerCase()
    if (draft.passwordResetRequests.some((r) => r.email === address && r.status === 'pending'))
      return
    const account = draft.playerAccounts.find((a) => a.claimed && a.email.toLowerCase() === address)
    const player = account && draft.playerProfiles.find((p) => p.playerId === account.playerId)
    draft.passwordResetRequests.unshift({
      id: crypto.randomUUID(),
      email: address,
      playerId: player?.playerId ?? null,
      playerName: player?.fullName ?? null,
      rtrId: player?.rtrId ?? null,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      canIssue: !!player,
    })
  })
}

export async function getPasswordResetRequests(
  page: number,
  signal?: AbortSignal,
): Promise<PasswordResetRequestList> {
  if (isRealDataMode()) return realRequest(`/api/password-reset-requests?page=${page}`, { signal })
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Sign in as ROTRA Admin.')
  requireAdminOnline()
  const rows = readMockState().passwordResetRequests
  return { total: rows.length, page, rows: rows.slice((page - 1) * 25, page * 25) }
}

export async function reviewPasswordReset(
  input: ReviewPasswordResetInput,
): Promise<{ token: string | null }> {
  if (isRealDataMode())
    return realRequest(`/api/password-reset-requests/${encodeURIComponent(input.id)}`, {
      method: 'POST',
      body: input,
    })
  const session = await getAdminSession()
  if (session.kind !== 'owner') throw new MockError('permission', 'Sign in as ROTRA Admin.')
  return adminMutation(500, (draft) => {
    const request = draft.passwordResetRequests.find((r) => r.id === input.id)
    if (!request || request.status === 'declined')
      throw new MockError('conflict', 'This request was already reviewed.')
    if (input.action === 'issue' && (!input.ownershipVerified || !request.canIssue))
      throw new MockError('conflict', 'Verify account ownership before generating a link.')
    if (input.action === 'decline' && request.status !== 'pending')
      throw new MockError('conflict', 'This request was already reviewed.')
    request.status = input.action === 'issue' ? 'issued' : 'declined'
    request.reviewedAt = new Date().toISOString()
    request.reviewedBy = session.account.email
    if (input.action === 'decline') return { token: null }
    const prefix = `reviewed-${request.playerId}-`
    for (const token of Object.keys(draft.resetLinks))
      if (token.startsWith(prefix)) draft.resetLinks[token] = 'used'
    const token = `${prefix}${crypto.randomUUID()}`
    draft.resetLinks[token] = 'valid'
    return { token }
  })
}
