import { moneyField } from '@rotra/schema/money'
import { nameField } from '@rotra/schema/name'
import { applyMockClubPassword, validateMockClubPassword } from '../auth/fetchers'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess } from '../mock/transaction'
import {
  buildPostValues,
  clubInitials,
  DEFAULT_POST_TEMPLATE,
  fillPostTemplate,
} from './club.rules'

function clubIn(state: MockState) {
  const club = state.clubs.find((c) => c.id === DEMO_CLUB_ID)
  if (!club) throw new MockError('permission', 'Club not available.')
  return club
}
const changeClub = <T>(change: (state: MockState) => { data: T; text: string }) =>
  queueMutation({ area: 'Club settings', onlineOnly: true, clubAccess: true }, change)
export const updateClubLogo = (input: { logoUrl: string | null }) =>
  changeClub((state) => {
    if (
      input.logoUrl !== null &&
      !/^(https?:|data:image\/(png|jpeg|webp);base64,)/.test(input.logoUrl)
    )
      throw new MockError('permission', 'Choose an image.', { logoUrl: 'Choose an image.' })
    clubIn(state).logoUrl = input.logoUrl
    return { data: null, text: 'Club logo updated' }
  })
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
  changeClub((state) => {
    const club = clubIn(state)
    if (input.template !== undefined) club.postTemplate = input.template
    if (input.description !== undefined) club.description = input.description
    if (input.courtRules !== undefined) club.courtRules = input.courtRules
    return { data: null, text: 'Facebook post saved' }
  })
export const resetFacebookPostTemplate = () =>
  changeClub((state) => {
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
  const values = buildPostValues({
    club: { ...club, ...draft },
    session,
    courts,
    roster: roster.map((r) => ({ name: r.nameSnapshot, nickname: r.nicknameSnapshot })),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === sessionId)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((w) => ({
        name: state.clubPlayers.find((p) => p.id === w.clubPlayerId)?.fullName ?? '',
      })),
    openSlots: Math.max(0, courts.length * session.playersPerCourt - roster.length),
    mode: session.sessionMode,
    minimum: session.minimumGames,
  })
  return {
    text: fillPostTemplate(draft?.template ?? club.postTemplate ?? DEFAULT_POST_TEMPLATE, values),
    playerCount: roster.length,
    sessionTitle: session.title,
  }
}
export async function getFacebookPost(sessionId: string) {
  await delay()
  return postFor(readMockState(), sessionId)
}
export async function getPostPreview(draft: {
  template?: string
  description?: string
  courtRules?: string
}) {
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
