import { getAdminSession } from '../admin-account/fetchers'
import { getSession } from '../auth/fetchers'
import { requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import type { AccountVerification, AdminAccountVerification } from './accountVerification.types'
import { accountVerificationIn, adminAccountVerificationIn } from './mockVerification'

/** The expected player ID scopes the cache. The session decides whose account can be read. */
export async function getMyAccountVerification(
  playerId: string,
  signal?: AbortSignal,
): Promise<AccountVerification | null> {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(200, signal)
  requireOnline()
  const session = await getSession('player')
  if (!session || session.account.id !== playerId) return null

  return accountVerificationIn(readMockState(), playerId)
}

/** Admin Player detail's verification card, available only for registered players. */
export async function getAdminAccountVerification(
  playerId: string,
  signal?: AbortSignal,
): Promise<AdminAccountVerification | null> {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(400, signal)
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player verification details.')

  return adminAccountVerificationIn(readMockState(), playerId)
}
