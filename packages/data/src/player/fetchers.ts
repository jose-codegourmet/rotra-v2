import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import { getSession } from '../auth/fetchers'
import { playerRequest } from '../leaderboard/request'
import { checkMockSave, getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import type { PlayerProfile, PlayerRank, PlayerSessionRecord } from './player.types'
import { playerProjection } from './projection'

export async function getPlayerRank(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerRank | null> {
  await playerRequest(signal)
  return playerProjection().ranks[playerId] ?? null
}
export async function getPlayerGames(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerSessionRecord[]> {
  await playerRequest(signal)
  return playerProjection().games[playerId] ?? []
}
export async function findPlayerByRtrId(
  rtrId: string,
  signal?: AbortSignal,
): Promise<{ playerId: string } | null> {
  await playerRequest(signal)
  const player = playerProjection().players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  return player ? { playerId: player.id } : null
}

export async function getPlayerProfile(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerProfile | null> {
  await playerRequest(signal)
  return readMockState().playerProfiles.find((player) => player.playerId === playerId) ?? null
}

/** Saves the signed-in player's personal fields. Offline and failed saves leave the store unchanged. */
export async function updateMyProfile(input: PersonalProfileValues): Promise<PlayerProfile> {
  await delay(900)
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      "You're offline, so nothing was saved. Your edits are still here; save again when you're connected.",
    )
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to edit your profile.')
  // Strict: phone, email, the RTR ID or rank in the input are rejected, never silently dropped.
  const values = personalProfileSchema.parse(input)
  checkMockSave()
  const toNumber = (text: string) => (text ? Number(text) : null)
  let saved: PlayerProfile | undefined
  mockStore.update((draft) => {
    const profile = draft.playerProfiles.find((entry) => entry.playerId === session.account.id)
    if (!profile) throw new MockError('permission', 'This profile is not yours to edit.')
    profile.fullName = values.fullName
    profile.nickname = values.nickname || null
    profile.playingStyle = values.playingStyle
    profile.experienceYears = toNumber(values.experienceYears)
    profile.experienceMonths = toNumber(values.experienceMonths)
    profile.socialLinks = {
      facebook: values.facebook,
      instagram: values.instagram,
      youtube: values.youtube,
      linkedin: values.linkedin,
    }
    saved = structuredClone(profile)
  })
  if (!saved) throw new Error('Profile save produced no result.')
  return saved
}
