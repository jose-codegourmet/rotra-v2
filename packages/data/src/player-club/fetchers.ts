import { getSession } from '../auth/fetchers'
import type { Club } from '../club/club.types'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { requireProfileAccess } from '../player/visibility'
import { isRealDataMode } from '../real/mode'
import {
  realGetMyClubs,
  realGetPlayerClubs,
  realJoinClub,
  realLeaveClub,
} from '../real/player-club'

/**
 * One club on a profile's clubs card (#766), in both modes. `joinedVia` is set only when the
 * signed-in player reads their own clubs; another player's rows never carry it.
 */
export type PlayerClub = Pick<Club, 'id' | 'name' | 'initials' | 'logoUrl'> & {
  joinedVia?: 'club_link' | 'session_link' | 'club_added'
}

async function owner() {
  requireOnline()
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to see your clubs.')
  return session.account.id
}
/**
 * The clubs a player is currently saved in (P-PROFILE clubs card, #766). Readable whenever the
 * profile is: the same access rule as the profile read (always private: only the player; private:
 * signed in). The owner's read adds how they joined.
 */
export async function getPlayerClubs(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerClub[]> {
  if (isRealDataMode()) {
    const session = await getSession('player').catch(() => null)
    return session?.account.id === playerId
      ? realGetMyClubs(signal)
      : realGetPlayerClubs(playerId, signal)
  }
  await delay(200, signal)
  requireOnline()
  await requireProfileAccess(playerId)
  const own = (await getSession('player'))?.account.id === playerId
  const state = readMockState()
  const seen = new Set<string>()
  return state.clubPlayers
    .filter((p) => p.playerId === playerId && !p.removedAt)
    .flatMap((p) => {
      const club = state.clubs.find((c) => c.id === p.clubId)
      if (!club || seen.has(club.id)) return []
      seen.add(club.id)
      const row: PlayerClub = {
        id: club.id,
        name: club.name,
        initials: club.initials,
        logoUrl: club.logoUrl,
      }
      if (own)
        row.joinedVia =
          p.joinedVia === 'club'
            ? 'club_link'
            : p.joinedVia === 'session'
              ? 'session_link'
              : 'club_added'
      return [row]
    })
}
/** Join club from a club invite link; `inviteCode` is the link's `k`, checked in real mode (#712). */
export async function joinClub({
  clubId,
  inviteCode,
}: {
  clubId: string
  inviteCode?: string | null
}) {
  if (isRealDataMode()) return realJoinClub(clubId, inviteCode)
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
  if (isRealDataMode()) return realLeaveClub(clubId)
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
