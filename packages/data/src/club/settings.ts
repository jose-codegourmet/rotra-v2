import { moneyField } from '@rotra/schema/money'
import { nameField } from '@rotra/schema/name'
import { applyMockClubPassword, validateMockClubPassword } from '../auth/fetchers'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess } from '../mock/transaction'
import { realGetFacebookPost, realGetPostPreview } from '../real/facebook-post'
import { isRealDataMode } from '../real/mode'
import { realRegenerateClubInvite, realSaveFacebookPost, realUpdateClubLogo } from '../real/queue'
import { clubInitials, composeFacebookPost } from './club.rules'
import { MOCK_INVITE_CODE_LENGTH, newClubInviteCode } from './inviteCode'

function clubIn(state: MockState) {
  const club = state.clubs.find((c) => c.id === DEMO_CLUB_ID)
  if (!club) throw new MockError('permission', 'Club not available.')
  return club
}
const changeClub = <T>(change: (state: MockState) => { data: T; text: string }) =>
  queueMutation({ area: 'Club settings', onlineOnly: true, clubAccess: true }, change)
export const updateClubLogo = (input: { logoUrl: string | null; expectedRevision?: string }) =>
  isRealDataMode()
    ? realUpdateClubLogo(input)
    : changeClub((state) => {
        if (
          input.logoUrl !== null &&
          !/^(https?:|data:image\/(png|jpeg|webp);base64,)/.test(input.logoUrl)
        )
          throw new MockError('permission', 'Choose an image.', { logoUrl: 'Choose an image.' })
        const club = clubIn(state)
        // At most two logos are held: uploading pushes the current one to previous, and Remove
        // keeps the removed logo as previous (initials show).
        if (club.logoUrl) club.logoPreviousUrl = club.logoUrl
        club.logoUrl = input.logoUrl
        return {
          data: null,
          text: input.logoUrl === null ? 'Club logo removed' : 'Club logo updated',
        }
      })
/** Swaps the current and previous logo. */
export const restorePreviousClubLogo = () => {
  if (isRealDataMode()) throw new NotConnectedError()
  return changeClub((state) => {
    const club = clubIn(state)
    if (!club.logoPreviousUrl) throw new MockError('conflict', 'No previous logo to restore.')
    const current = club.logoUrl
    club.logoUrl = club.logoPreviousUrl
    club.logoPreviousUrl = current
    return { data: null, text: 'Previous logo restored' }
  })
}
/** Writes a fresh invite code; the old code stops being the current link. */
export const regenerateClubInvite = () => {
  if (isRealDataMode()) return realRegenerateClubInvite()
  return changeClub((state) => {
    const club = clubIn(state)
    club.inviteCode = newClubInviteCode(MOCK_INVITE_CODE_LENGTH, club.inviteCode)
    return { data: { inviteCode: club.inviteCode }, text: 'Club invite link regenerated' }
  })
}
/** Whether players may check themselves in; missing reads as on. */
export const updateSelfCheckIn = (input: { enabled: boolean }) => {
  if (isRealDataMode()) throw new NotConnectedError()
  return changeClub((state) => {
    clubIn(state).selfCheckInEnabled = input.enabled
    return {
      data: null,
      text: input.enabled ? 'Players can check themselves in' : 'Only you mark presence now',
    }
  })
}
export const requestClubNameChange = (input: { requestedName: string }) =>
  changeClub((state) => {
    const name = nameField.parse(input.requestedName)
    clubIn(state).pendingNameChange = { requestedName: name, requestedAt: Date.now() }
    return { data: null, text: 'Name change requested' }
  })
export const cancelClubNameChange = () =>
  changeClub((state) => {
    clubIn(state).pendingNameChange = null
    return { data: null, text: 'Name-change request cancelled' }
  })
/** Queue DevMenu only: acts as the platform owner approving the club's own pending request. */
export const simulateClubNameApproval = () =>
  changeClub((state) => {
    const club = clubIn(state)
    if (!club.pendingNameChange) throw new MockError('conflict', 'No pending name change.')
    club.name = club.pendingNameChange.requestedName
    club.initials = clubInitials(club.name)
    club.pendingNameChange = null
    return { data: null, text: `Approved: your club is now ${club.name}` }
  })
export const updateSessionDefaults = (input: {
  defaultPlayersPerCourt: number
  defaultEntranceFeeMinor: number | null
}) =>
  changeClub((state) => {
    if (
      !Number.isInteger(input.defaultPlayersPerCourt) ||
      input.defaultPlayersPerCourt < 2 ||
      input.defaultPlayersPerCourt > 20
    )
      throw new MockError('permission', 'Use 2–20 players per court.', {
        defaultPlayersPerCourt: 'Use 2–20 players per court.',
      })
    const club = clubIn(state)
    club.defaultPlayersPerCourt = input.defaultPlayersPerCourt
    club.defaultEntranceFeeMinor =
      input.defaultEntranceFeeMinor === null
        ? null
        : moneyField.parse(input.defaultEntranceFeeMinor)
    return { data: null, text: 'Session defaults saved' }
  })
export const saveFacebookPost = (input: {
  template?: string
  description?: string
  courtRules?: string
}) =>
  isRealDataMode()
    ? realSaveFacebookPost(input)
    : changeClub((state) => {
        const club = clubIn(state)
        if (input.template !== undefined) club.postTemplate = input.template
        if (input.description !== undefined) club.description = input.description
        if (input.courtRules !== undefined) club.courtRules = input.courtRules
        return { data: null, text: 'Facebook post saved' }
      })
export const resetFacebookPostTemplate = () =>
  isRealDataMode()
    ? realSaveFacebookPost({ template: null })
    : changeClub((state) => {
        clubIn(state).postTemplate = null
        return { data: null, text: 'Default template restored' }
      })
export async function changeClubPassword(input: { current: string; next: string }) {
  const result = await queueMutation(
    { area: 'Club settings', onlineOnly: true, clubAccess: true },
    () => {
      validateMockClubPassword(input.current, input.next)
      return { data: null, text: 'Password changed' }
    },
  )
  applyMockClubPassword(input.next)
  return result
}
function postFor(
  state: MockState,
  sessionId: string,
  draft?: { template?: string; description?: string; courtRules?: string },
) {
  const club = clubIn(state),
    session = state.sessions.find((s) => s.id === sessionId)
  if (!session) throw new MockError('permission', 'Session not available.')
  const roster = state.roster
    .filter((r) => r.sessionId === sessionId)
    .sort((a, b) => a.confirmedAt - b.confirmedAt)
  const courts = state.courts.filter((c) => c.sessionId === sessionId && !c.removedAt)
  return composeFacebookPost({
    club,
    draft,
    session,
    courts,
    roster: roster.map((r) => ({ name: r.nameSnapshot, nickname: r.nicknameSnapshot })),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === sessionId)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((w) => ({
        name: state.clubPlayers.find((p) => p.id === w.clubPlayerId)?.fullName ?? '',
      })),
  })
}
export async function getFacebookPost(sessionId: string) {
  if (isRealDataMode()) return realGetFacebookPost(sessionId)
  await delay()
  return postFor(readMockState(), sessionId)
}
export async function getPostPreview(draft: {
  template?: string
  description?: string
  courtRules?: string
}) {
  if (isRealDataMode()) return realGetPostPreview(draft)
  await delay()
  requireOnline()
  requireClubAccess()
  const state = readMockState()
  const session =
    state.sessions.find((s) => s.state === 'active') ??
    state.sessions
      .filter((s) => s.state === 'prepared')
      .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt)[0]
  if (!session) return null
  return postFor(state, session.id, draft)
}
