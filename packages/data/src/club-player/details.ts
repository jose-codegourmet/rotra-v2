import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import { realGetClubPlayerDetails, realUpdateClubPlayerDetails } from '../real/queue'
import type { ClubPlayerDetails, ClubPlayerDetailsInput } from './clubPlayer.types'

const NOT_EDITABLE = 'This player registered, so they keep their own details.'
const number = (typed: string) => (typed.trim() ? Number(typed) : null)

/** Edit details for the club's own guest or unclaimed player; registered players are refused. */
export async function getClubPlayerDetails(id: string): Promise<ClubPlayerDetails> {
  if (isRealDataMode()) return realGetClubPlayerDetails(id)
  await delay(200)
  const state = readMockState()
  const row = state.clubPlayers.find((p) => p.id === id)
  if (!row) throw new MockError('permission', 'Player not available.')
  if (row.identity === 'registered') throw new MockError('permission', NOT_EDITABLE)
  const profile = row.playerId
    ? state.playerProfiles.find((p) => p.playerId === row.playerId)
    : undefined
  const account = row.playerId
    ? state.playerAccounts.find((a) => a.playerId === row.playerId)
    : undefined
  return {
    clubPlayerId: row.id,
    identity: row.identity,
    fullName: row.fullName,
    nickname: row.nickname,
    phoneOnFile: Boolean(account?.phone) || row.identity === 'pending',
    profile:
      row.identity === 'unclaimed' && profile
        ? {
            email: account?.email ?? '',
            playingStyle: profile.playingStyle,
            experienceYears: profile.experienceYears,
            experienceMonths: profile.experienceMonths,
            socialLinks: { ...profile.socialLinks },
          }
        : null,
  }
}

/** Saves Edit details. A phone is only taken when none is on file; the mock keeps it as typed. */
export async function updateClubPlayerDetails({
  id,
  values,
}: {
  id: string
  values: ClubPlayerDetailsInput
}) {
  if (isRealDataMode()) return realUpdateClubPlayerDetails(id, values)
  await delay(300)
  checkMockSave()
  if (!values.fullName.trim())
    throw new MockError('permission', 'Enter a name.', { fullName: 'Enter a name.' })
  mockStore.update((draft) => {
    const row = draft.clubPlayers.find((p) => p.id === id)
    if (!row || row.identity === 'registered') throw new MockError('permission', NOT_EDITABLE)
    row.fullName = values.fullName.trim()
    row.nickname = values.nickname.trim() || null
    if (row.identity === 'guest' && values.phone.trim()) row.identity = 'pending'
    if (!row.playerId || row.identity !== 'unclaimed') return
    const profile = draft.playerProfiles.find((p) => p.playerId === row.playerId)
    const account = draft.playerAccounts.find((a) => a.playerId === row.playerId)
    if (profile) {
      profile.fullName = row.fullName
      profile.nickname = row.nickname
      profile.playingStyle = values.playingStyle.trim()
      profile.experienceYears = number(values.experienceYears)
      profile.experienceMonths = number(values.experienceMonths)
      profile.socialLinks = {
        facebook: values.facebook.trim(),
        instagram: values.instagram.trim(),
        youtube: values.youtube.trim(),
        linkedin: values.linkedin.trim(),
      }
    }
    if (account) account.email = values.email.trim()
  })
  return { clubPlayerId: id }
}
