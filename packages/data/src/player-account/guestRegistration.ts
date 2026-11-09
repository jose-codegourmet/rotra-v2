import { type RegistrationValues, registrationRequestSchema } from '@rotra/schema/registration'
import type { MockSession } from '../auth/auth.types'
import { signIn } from '../auth/fetchers'
import { foundingCities } from '../fixtures/foundingCities'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { applyPersonalProfile } from '../player/fetchers'
import { realRequest } from '../real/client'
import { isRealDataMode } from '../real/mode'
import type { CompleteClaimResult } from './playerAccount.types'

export type GuestRegistrationResult =
  | { status: 'account-match' }
  | ({
      status: 'registered'
      session: MockSession
      clubName: string | null
      sessionSlug: string | null
      sessionTitle: string | null
    } & CompleteClaimResult)

export async function getGuestRegistrationClub(
  clubId: string,
  signal?: AbortSignal,
  sessionSlug?: string | null,
) {
  if (isRealDataMode() && (!clubId || sessionSlug)) throw new NotConnectedError()
  if (isRealDataMode())
    return realRequest<{
      clubName: string | null
      sessionTitle?: string | null
      sessionPageUrl?: string | null
    }>(`/api/register/${encodeURIComponent(clubId)}`, {
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

/** Mock registration joins only the originating club; session requests remain unsent. */
export async function completeGuestRegistration(input: {
  clubId: string
  sessionSlug?: string | null
  attempt: string
  values: RegistrationValues
}): Promise<GuestRegistrationResult> {
  const parsed = registrationRequestSchema.parse(input)
  if (isRealDataMode() && (!input.clubId || input.sessionSlug)) throw new NotConnectedError()
  if (isRealDataMode())
    return realRequest(`/api/register/${encodeURIComponent(input.clubId)}`, {
      method: 'POST',
      body: parsed,
    })
  await delay(400)
  requireOnline()
  checkMockSave()
  const { values, attempt } = parsed
  const club = await getGuestRegistrationClub(input.clubId, undefined, input.sessionSlug)
  const city = input.clubId ? null : foundingCities.find((city) => city.code === values.cityCode)
  if (!input.clubId && !city)
    throw new MockError('conflict', 'Pick your city or province.', {
      cityCode: 'Pick your city or province.',
    })
  let result: CompleteClaimResult | undefined
  let matched = false
  mockStore.update((draft) => {
    const key = `registration:${attempt}`
    const previous = draft.claimLinks[key]
    const account = previous && draft.playerAccounts.find((a) => a.playerId === previous.playerId)
    if (previous && (!account || account.phone !== values.phone || account.email !== values.email))
      throw new MockError('permission', 'Start a new registration with these details.')
    if (
      !previous &&
      draft.playerAccounts.some(
        (a) => a.phone === values.phone || a.email.toLowerCase() === values.email,
      )
    ) {
      matched = true
      return
    }
    const id = previous?.playerId ?? crypto.randomUUID()
    if (!previous) {
      const location = draft.clubs.find((c) => c.id === input.clubId)?.locationCode ?? city?.code
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
      const [year, month, date] = day.split('-')
      const prefix = `RTR-${location}-${month}${date}${year?.slice(2)}-`
      const serial =
        Math.max(
          0,
          ...draft.players
            .filter((p) => p.rtrId.startsWith(prefix))
            .map((p) => Number(p.rtrId.split('-').at(-1)) || 0),
        ) + 1
      const rtrId = `${prefix}${String(serial).padStart(4, '0')}`
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
    if (
      input.clubId &&
      !draft.clubPlayers.some((p) => p.clubId === input.clubId && p.playerId === id && !p.removedAt)
    ) {
      draft.clubPlayers.push({
        id: crypto.randomUUID(),
        clubId: input.clubId,
        playerId: id,
        fullName: values.fullName,
        nickname: values.nickname || null,
        identity: 'registered',
        playingLevel: null,
        joinedVia: input.sessionSlug ? 'session' : 'club',
      })
    }
    const profile = draft.playerProfiles.find((p) => p.playerId === id)
    if (!profile) throw new Error('Registration produced no profile.')
    const { email: _email, phone: _phone, password: _password, ...personal } = values
    applyPersonalProfile(profile, personal)
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
  }
}
