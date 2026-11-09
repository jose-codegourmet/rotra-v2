import { getSession } from '../auth/fetchers'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore } from '../mock/store'
import { isRealDataMode } from '../real/mode'

async function change(confirm: boolean) {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(400)
  requireOnline()
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to confirm your email.')
  checkMockSave()
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    if (!account) throw new MockError('permission', 'Sign in to confirm your email.')
    if (confirm) account.emailConfirmedAt = new Date().toISOString()
  })
  return { playerId: session.account.id, acknowledged: true }
}
export const resendConfirmationEmail = () => change(false)
/** Mock-only confirmation; no email is delivered by either mock action. */
export const confirmMockEmail = () => change(true)
