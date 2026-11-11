'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSession } from '../auth/fetchers'
import { getConnectivity } from '../connectivity/connectivity'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { checkMockSave } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { playerKeys } from '../player/queryKeys'
import { isRealDataMode } from '../real/mode'
import { playerAccountKeys } from './queryKeys'
export async function setProfilePrivacy(input: { profilePrivate: boolean }) {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(600)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to change your profile privacy.')
  const stored = readMockState().playerAccounts.find((a) => a.playerId === session.account.id)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      `Couldn't save because you're offline. Your profile is still ${stored?.profilePrivate ? 'private' : 'public'}.`,
    )
  checkMockSave()
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    const profile = draft.playerProfiles.find((p) => p.playerId === session.account.id)
    if (!account || !profile)
      throw new MockError('permission', 'Sign in to change your profile privacy.')
    account.profilePrivate = input.profilePrivate
    profile.profilePrivate = input.profilePrivate
  })
  return { playerId: session.account.id }
}
export function useSetProfilePrivacy() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setProfilePrivacy,
    networkMode: 'always',
    onSuccess: (result) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerAccountKeys.me(result.playerId) }),
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
      ]),
  })
}
