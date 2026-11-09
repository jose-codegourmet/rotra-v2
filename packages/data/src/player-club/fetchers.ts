import { getSession } from '../auth/fetchers'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'

async function owner() {
  if (isRealDataMode()) throw new NotConnectedError()
  requireOnline()
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to see your clubs.')
  return session.account.id
}
export async function getMyClubs(signal?: AbortSignal) {
  await delay(200, signal)
  const id = await owner(),
    state = readMockState()
  return state.clubPlayers
    .filter((p) => p.playerId === id && !p.removedAt)
    .flatMap((p) => {
      const club = state.clubs.find((c) => c.id === p.clubId)
      return club
        ? [
            {
              ...club,
              joinedVia:
                p.joinedVia === 'club'
                  ? ('club_link' as const)
                  : p.joinedVia === 'session'
                    ? ('session_link' as const)
                    : ('club_added' as const),
            },
          ]
        : []
    })
}
export async function joinClub(clubId: string) {
  await delay(400)
  const id = await owner()
  checkMockSave()
  mockStore.update((draft) => {
    if (!draft.clubs.some((c) => c.id === clubId))
      throw new MockError('permission', 'This club link is not available.')
    if (draft.clubPlayers.some((p) => p.playerId === id && p.clubId === clubId && !p.removedAt))
      return
    const removed = draft.clubPlayers.find(
      (p) => p.playerId === id && p.clubId === clubId && p.removedAt,
    )
    if (removed) {
      removed.removedAt = undefined
      removed.joinedVia = 'club'
      return
    }
    const profile = draft.playerProfiles.find((p) => p.playerId === id)
    if (!profile) throw new MockError('permission', 'Sign in to join this club.')
    draft.clubPlayers.push({
      id: crypto.randomUUID(),
      clubId,
      playerId: id,
      fullName: profile.fullName,
      nickname: profile.nickname,
      identity: 'registered',
      playingLevel: null,
      joinedVia: 'club',
    })
  })
  return { playerId: id, clubId }
}
export async function leaveClub(clubId: string) {
  await delay(400)
  const id = await owner()
  checkMockSave()
  mockStore.update((draft) => {
    // Keep a history tombstone, as the existing Saved players deletion does.
    for (const player of draft.clubPlayers)
      if (player.playerId === id && player.clubId === clubId) player.removedAt = Date.now()
  })
  return { playerId: id, clubId }
}
