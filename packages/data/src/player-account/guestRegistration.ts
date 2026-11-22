import { type RegistrationValues, registrationRequestSchema } from '@rotra/schema/registration'
import type { MockSession } from '../auth/auth.types'
import { signIn } from '../auth/fetchers'
import { foundingCities } from '../fixtures/foundingCities'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { applyPersonalProfile } from '../player/fetchers'
import { allocateMockRtrId } from '../player/unclaimed'
import { activateClubMembership } from '../player-club/membership'
import { realRequest } from '../real/client'
import { isRealDataMode } from '../real/mode'
import type { CompleteClaimResult } from './playerAccount.types'
import { claimUnclaimedPerson, linkPhoneRecords, unclaimedAccountFor } from './unclaimedIdentity'

export type GuestRegistrationResult =
  | { status: 'account-match' }
  | ({
      status: 'registered'
      session: MockSession
      clubName: string | null
      sessionSlug: string | null
      sessionTitle: string | null
      /**
       * Set when the registration claimed an unclaimed player (D-2026-11-16-04): the clubs whose
       * records joined the account; the RTR ID is the one the person already had.
       */
      joinedClubs?: string[]
    } & CompleteClaimResult)

/**
 * The club's registration route; `?session=` when the visitor came from a session link (#689),
 * `?k=` with the club invite link's code, which the server checks (#712). No club: the Admin
 * link's own route, `/api/register`.
 */
function registerPath(clubId: string, sessionSlug?: string | null, inviteCode?: string | null) {
  if (!clubId) return '/api/register'
  const search = new URLSearchParams()
  if (sessionSlug) search.set('session', sessionSlug)
  if (inviteCode) search.set('k', inviteCode)
  const query = search.toString()
  return `/api/register/${encodeURIComponent(clubId)}${query ? `?${query}` : ''}`
}

export async function getGuestRegistrationClub(
  clubId: string,
  signal?: AbortSignal,
  sessionSlug?: string | null,
  inviteCode?: string | null,
) {
  // The Admin link (no club) has nothing to read: no club name, no session.
  if (isRealDataMode() && !clubId)
    return { clubName: null, sessionTitle: null, sessionPageUrl: null }
  if (isRealDataMode())
    return realRequest<{
      clubName: string | null
      sessionTitle?: string | null
      sessionPageUrl?: string | null
    }>(registerPath(clubId, sessionSlug, inviteCode), {
      signal,
    })
  await delay(200, signal)
  requireOnline()
  if (!clubId) return { clubName: null, sessionTitle: null, sessionPageUrl: null }
  const club = readMockState().clubs.find((club) => club.id === clubId)
  if (!club) throw new MockError('permission', 'This registration invitation is not available.')
  const publication = sessionSlug
    ? readMockState().sessions.find((p) => p.publicSlug === sessionSlug && p.clubId === clubId)
    : undefined
  if (sessionSlug && !publication)
    throw new MockError('permission', 'This session link is not available.')
  return {
    clubName: club.name,
    sessionTitle: publication?.title ?? null,
    sessionPageUrl: publication ? `/s/${encodeURIComponent(publication.publicSlug)}` : null,
  }
}

/**
 * Mock registration joins the originating club. An email that clubs already saved as an unclaimed
 * player claims that player (D-2026-11-16-04): the person keeps the RTR ID and every club's record
 * under the email joins the account. Older records with the same phone and no email still join too
 * (D-2026-11-11-03). Session requests remain unsent.
 */
export async function completeGuestRegistration(input: {
  clubId: string
  sessionSlug?: string | null
  /** The club invite link's `k`; checked on the server in real mode (#712). */
  inviteCode?: string | null
  attempt: string
  values: RegistrationValues
}): Promise<GuestRegistrationResult> {
  const parsed = registrationRequestSchema.parse(input)
  // The Admin link (no club) posts the picked city with the form; the player joins no club.
  if (isRealDataMode())
    return realRequest(registerPath(input.clubId, input.sessionSlug, input.inviteCode), {
      method: 'POST',
      body: parsed,
    })
  await delay(400)
  requireOnline()
  checkMockSave()
  const { values, attempt } = parsed
  const club = await getGuestRegistrationClub(input.clubId, undefined, input.sessionSlug)
  const city = input.clubId ? null : foundingCities.find((city) => city.code === values.cityCode)
  // An email clubs already saved keeps its RTR ID, so no city is needed for it.
  if (!input.clubId && !city && !unclaimedAccountFor(readMockState(), [values.email]))
    throw new MockError('conflict', 'Pick your city or province.', {
      cityCode: 'Pick your city or province.',
    })
  let result: CompleteClaimResult | undefined
  let matched = false
  let joinedClubs: string[] | undefined
  mockStore.update((draft) => {
    const key = `registration:${attempt}`
    const previous = draft.claimLinks[key]
    const account = previous && draft.playerAccounts.find((a) => a.playerId === previous.playerId)
    if (previous && (!account || account.phone !== values.phone || account.email !== values.email))
      throw new MockError('permission', 'Start a new registration with these details.')
    // The email typed is the ROTRA email: the one a club saved claims that unclaimed player.
    const unclaimed = previous ? undefined : unclaimedAccountFor(draft, [values.email])
    if (
      !previous &&
      draft.playerAccounts.some(
        (a) =>
          a.playerId !== unclaimed?.playerId &&
          (a.phone === values.phone || a.email.toLowerCase() === values.email),
      )
    ) {
      matched = true
      return
    }
    const id = previous?.playerId ?? unclaimed?.playerId ?? crypto.randomUUID()
    if (unclaimed) {
      joinedClubs = claimUnclaimedPerson(draft, id, { phone: values.phone }).joinedClubs
      unclaimed.email = values.email
      unclaimed.emailConfirmedAt = null
      draft.claimLinks[key] = {
        playerId: id,
        clubName: club.clubName ?? 'ROTRA',
        status: 'valid',
        checks: 0,
      }
    } else if (!previous) {
      const location = draft.clubs.find((c) => c.id === input.clubId)?.locationCode ?? city?.code
      if (!location) throw new Error('Registration has no founding city.')
      const rtrId = allocateMockRtrId(draft, location)
      draft.players.push({
        id,
        rtrId,
        fullName: values.fullName,
        nickname: values.nickname || null,
      })
      draft.playerProfiles.push({
        playerId: id,
        rtrId,
        fullName: values.fullName,
        nickname: values.nickname || null,
        // New registrations default to Private (D-2026-11-12-01).
        profileVisibility: 'private',
        hiddenFromDirectory: false,
        picture: null,
        playingStyle: '',
        experienceYears: null,
        experienceMonths: null,
        socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
      })
      draft.playerRanks[id] = {
        playerId: id,
        fullName: values.fullName,
        nickname: values.nickname || null,
        levelIndex: null,
        state: 'provisional',
        updatePending: null,
        position: null,
        recentCount: 0,
        olderCount: 0,
      }
      draft.playerGames[id] = []
      draft.playerAccounts.push({
        playerId: id,
        phone: values.phone,
        email: values.email,
        phoneHidden: false,
        claimed: true,
        emailConfirmedAt: null,
      })
      draft.adminPlayerRecords[id] = {
        archivedAt: null,
        revision: 1,
        createdByClubId: input.clubId || null,
        adminCreated: !input.clubId,
      }
      draft.claimLinks[key] = {
        playerId: id,
        clubName: club.clubName ?? 'ROTRA',
        status: 'valid',
        checks: 0,
      }
    }
    // D-2026-11-11-03, kept: every club's older record with this phone and no email joins the new
    // account automatically, with no Queue Master tap; one record per club, the earliest saved one.
    if (!previous) linkPhoneRecords(draft, id, values.phone)
    // Club or session link: one membership, reactivated when the player left before (#1018).
    if (input.clubId) {
      const member = activateClubMembership(
        draft,
        id,
        input.clubId,
        input.sessionSlug ? 'session' : 'club',
      )
      if (member && !member.fullName) member.fullName = values.fullName
    }
    const profile = draft.playerProfiles.find((p) => p.playerId === id)
    if (!profile) throw new Error('Registration produced no profile.')
    const { email: _email, phone: _phone, password: _password, ...personal } = values
    applyPersonalProfile(profile, personal)
    const player = draft.players.find((p) => p.id === id)
    if (player) {
      player.fullName = profile.fullName
      player.nickname = profile.nickname
    }
    result = {
      playerId: id,
      rtrId: profile.rtrId,
      firstName: profile.nickname || profile.fullName.split(' ')[0] || profile.fullName,
    }
  })
  if (matched) return { status: 'account-match' }
  if (!result) throw new Error('Registration produced no result.')
  const session = await signIn('player', { identifier: values.email, password: values.password })
  return {
    status: 'registered',
    ...result,
    session,
    clubName: club.clubName,
    sessionSlug: input.sessionSlug ?? null,
    sessionTitle: club.sessionTitle ?? null,
    ...(joinedClubs ? { joinedClubs } : {}),
  }
}
