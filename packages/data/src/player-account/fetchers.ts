import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { getSession } from '../auth/fetchers'
import { playerRequest } from '../leaderboard/request'
import { getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import type { MyAccount } from './playerAccount.types'

/** The signed-in player's own contacts; null when signed out. Never a public fetcher. */
export async function getMyAccount(signal?: AbortSignal): Promise<MyAccount | null> {
  await playerRequest(signal)
  const session = await getSession('player')
  const account = session
    ? readMockState().playerAccounts.find((entry) => entry.playerId === session.account.id)
    : undefined
  return account
    ? {
        playerId: account.playerId,
        phone: account.phone,
        email: account.email,
        phoneHidden: account.phoneHidden,
      }
    : null
}

/** Same acknowledgement for known and unknown emails. No email is delivered in the mock. */
export async function requestPasswordReset(email: string) {
  await delay(400)
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      "Couldn't send because you're offline. Try again when you're connected.",
    )
  emailField.parse(email)
  return { acknowledged: true }
}
export async function getResetLink(token: string, signal?: AbortSignal) {
  await delay(200, signal)
  if (getMockDevState().offline)
    throw new MockError('offline', "You're offline. Reconnect to check this reset link.")
  const status = readMockState().resetLinks[token]
  return { token, status: status === 'valid' ? ('valid' as const) : ('invalid' as const) }
}
/** Simulate consuming a reset link. Passwords are validated but never retained or returned. */
export async function resetPassword({ token, password }: { token: string; password: string }) {
  await delay(400)
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      "Couldn't save because you're offline. Try again when you're connected.",
    )
  passwordField.parse(password)
  mockStore.update((draft) => {
    if (draft.resetLinks[token] !== 'valid')
      throw new MockError('permission', 'This reset link has expired or was already used.')
    draft.resetLinks[token] = 'used'
  })
  return { saved: true }
}
