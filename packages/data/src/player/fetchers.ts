import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import { getSession } from '../auth/fetchers'
import { getConnectivity } from '../connectivity/connectivity'
import { playerRequest } from '../leaderboard/request'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { isProfileCharacterShown } from '../profile-character/fetchers'
import { isRealDataMode } from '../real/mode'
import {
  realFindPlayerByRtrId,
  realGetMyProfile,
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
import { isPrivatePlayer, requireProfileAccess } from './visibility'

export async function getPlayerRank(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerRank | null> {
  if (isRealDataMode()) return realGetPlayerRank(playerId, signal)
  await playerRequest(signal)
  await requireProfileAccess(playerId)
  return playerProjection().ranks[playerId] ?? null
}
export async function getPlayerGames(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerSessionRecord[]> {
  if (isRealDataMode()) return realGetPlayerGames(playerId, signal)
  await playerRequest(signal)
  await requireProfileAccess(playerId)
  return playerProjection().games[playerId] ?? []
}
export async function findPlayerByRtrId(
  rtrId: string,
  signal?: AbortSignal,
): Promise<{ playerId: string } | null> {
  if (isRealDataMode()) return realFindPlayerByRtrId(rtrId, signal)
  await playerRequest(signal)
  const player = playerProjection().players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  if (player && isPrivatePlayer(player.id) && !(await getSession('player'))) return null
  return player && !readMockState().adminPlayerRecords[player.id]?.archivedAt
    ? { playerId: player.id }
    : null
}

export async function getPlayerProfile(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerProfile | null> {
  if (isRealDataMode()) {
    // Like the mock, only the signed-in owner sees the Admin change note; that read is private.
    const session = await getSession('player').catch(() => null)
    return session?.account.id === playerId
      ? realGetMyProfile(signal)
      : realGetPlayerProfile(playerId, signal)
  }
  await playerRequest(signal)
  await requireProfileAccess(playerId)
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
  if (getConnectivity() === 'offline')
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
  if (isRealDataMode()) {
    if (choice.kind === 'previous' || (choice.kind === 'photo' && 'src' in choice))
      throw new MockError('permission', "This part of ROTRA isn't connected to saved data yet.")
    return realSetMyProfilePicture(choice)
  }
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to edit your profile.')
  let picture: string | null
  if (choice.kind === 'initials') picture = null
  else if (choice.kind === 'character') {
    if (!isProfileCharacterShown(choice.id)) throw new MockError('conflict', 'Choose a character.')
    picture = characterPictureReference(choice.id)
  } else if (choice.kind === 'previous' || (choice.kind === 'photo' && 'src' in choice)) {
    const state = readMockState()
    const previous = state.playerAccounts.find(
      (a) => a.playerId === session.account.id,
    )?.avatarPreviousRef
    const current = state.playerProfiles.find((p) => p.playerId === session.account.id)?.picture
    const src = choice.kind === 'previous' ? previous : choice.src
    if (!src || (src !== previous && src !== current))
      throw new MockError('conflict', 'That previous picture is no longer available.')
    picture = src
  } else if (choice.kind === 'photo' && 'file' in choice) {
    if (!choice.file.type.startsWith('image/')) throw new Error('Choose an image file')
    picture = await mockPhotoReference(choice.file, choice.crop)
  } else throw new Error('Choose a profile picture.')
  await delay(900)
  if (getConnectivity() === 'offline')
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
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    if (!account) throw new MockError('permission', 'Sign in to edit your profile.')
    const originalPrevious = account.avatarPreviousRef ?? null
    if (profile.picture && !profile.picture.startsWith('character:') && profile.picture !== picture)
      account.avatarPreviousRef = profile.picture
    else if (picture === account.avatarPreviousRef) account.avatarPreviousRef = null
    if ('previousPhoto' in choice) {
      const allowed = [
        null,
        originalPrevious,
        profile.picture && !profile.picture.startsWith('character:') ? profile.picture : null,
      ]
      if (!allowed.includes(choice.previousPhoto ?? null))
        throw new MockError('conflict', 'That previous picture is no longer available.')
      account.avatarPreviousRef = choice.previousPhoto ?? null
    }
    profile.picture = picture
    saved = structuredClone(profile)
  })
  if (!saved) throw new Error('Profile picture save produced no result.')
  return saved
}
