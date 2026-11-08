import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import { getSession } from '../auth/fetchers'
import { playerRequest } from '../leaderboard/request'
import { checkMockSave, getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import {
  realFindPlayerByRtrId,
  realGetPlayerGames,
  realGetPlayerProfile,
  realGetPlayerRank,
  realSetMyProfilePicture,
  realUpdateMyProfile,
} from '../real/player'
import { mockPhotoReference } from './photo'
import { characterPictureReference, type PlayerPictureChoice } from './picture'
import type { PlayerProfile, PlayerRank, PlayerSessionRecord } from './player.types'
import { playerProjection } from './projection'

export async function getPlayerRank(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerRank | null> {
  if (isRealDataMode()) return realGetPlayerRank(playerId, signal)
  await playerRequest(signal)
  return playerProjection().ranks[playerId] ?? null
}
export async function getPlayerGames(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerSessionRecord[]> {
  if (isRealDataMode()) return realGetPlayerGames(playerId, signal)
  await playerRequest(signal)
  return playerProjection().games[playerId] ?? []
}
export async function findPlayerByRtrId(
  rtrId: string,
  signal?: AbortSignal,
): Promise<{ playerId: string } | null> {
  if (isRealDataMode()) return realFindPlayerByRtrId(rtrId, signal)
  await playerRequest(signal)
  const player = playerProjection().players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  return player && !readMockState().adminPlayerRecords[player.id]?.archivedAt
    ? { playerId: player.id }
    : null
}

export async function getPlayerProfile(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerProfile | null> {
  if (isRealDataMode()) return realGetPlayerProfile(playerId, signal)
  await playerRequest(signal)
  const profile = readMockState().playerProfiles.find((player) => player.playerId === playerId)
  if (!profile) return null
  if (profile.adminChangeNote && (await getSession('player'))?.account.id !== playerId)
    delete profile.adminChangeNote
  return profile
}

/** Writes validated personal fields onto a store profile; blank experience is stored as null. */
export function applyPersonalProfile(profile: PlayerProfile, values: PersonalProfileValues) {
  const toNumber = (text: string) => (text ? Number(text) : null)
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
}

/** Saves the signed-in player's personal fields. Offline and failed saves leave the store unchanged. */
export async function updateMyProfile(input: PersonalProfileValues): Promise<PlayerProfile> {
  if (isRealDataMode()) return realUpdateMyProfile(input)
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
  let saved: PlayerProfile | undefined
  mockStore.update((draft) => {
    const profile = draft.playerProfiles.find((entry) => entry.playerId === session.account.id)
    if (!profile) throw new MockError('permission', 'This profile is not yours to edit.')
    applyPersonalProfile(profile, values)
    saved = structuredClone(profile)
  })
  if (!saved) throw new Error('Profile save produced no result.')
  return saved
}

/** Set the signed-in player's picture in the mock store, independent of profile edits. */
export async function setMyProfilePicture(choice: PlayerPictureChoice): Promise<PlayerProfile> {
  if (isRealDataMode()) return realSetMyProfilePicture(choice)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to edit your profile.')
  let picture: string | null
  if (choice.kind === 'initials') picture = null
  else if (choice.kind === 'character') picture = characterPictureReference(choice.id)
  else if (choice.kind === 'photo') {
    if (!choice.file.type.startsWith('image/')) throw new Error('Choose an image file')
    picture = await mockPhotoReference(choice.file, choice.crop)
  } else throw new Error('Choose a profile picture.')
  await delay(900)
  if (getMockDevState().offline)
    throw new MockError('offline', "You're offline. Reconnect and try again.")
  // Do not write to the previously signed-in player's account if the session changed while reading.
  const currentSession = await getSession('player')
  if (currentSession?.account.id !== session.account.id)
    throw new MockError('permission', 'Sign in to edit your profile.')
  checkMockSave()
  let saved: PlayerProfile | undefined
  mockStore.update((draft) => {
    const profile = draft.playerProfiles.find((entry) => entry.playerId === session.account.id)
    if (!profile) throw new MockError('permission', 'This profile is not yours to edit.')
    profile.picture = picture
    saved = structuredClone(profile)
  })
  if (!saved) throw new Error('Profile picture save produced no result.')
  return saved
}
