import { personalProfileSchema } from '@rotra/schema/personal-details'
import { phoneField } from '@rotra/schema/phone'
import { getSession, startMockPlayerSession } from '../auth/fetchers'
import { readClubInviteCode } from '../club/inviteCode'
import { getConnectivity } from '../connectivity/connectivity'
import { foundingCities } from '../fixtures/foundingCities'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { applyPersonalProfile } from '../player/fetchers'
import { queueSessionUrl } from '../player/mySessions'
import { allocateMockRtrId } from '../player/unclaimed'
import { finishClaim } from '../player-account/fetchers'
import { getGuestRegistrationClub } from '../player-account/guestRegistration'
import {
  claimUnclaimedPerson,
  linkPhoneRecords,
  unclaimedAccountFor,
  unclaimedIdentitiesOf,
} from '../player-account/unclaimedIdentity'
import { myAccountOf } from '../player-account/visibilitySettings'
import {
  realCompleteClaimWithGoogle,
  realConfirmGoogleLink,
  realGetInviteLanding,
  realReadGoogleOutcome,
  realRegisterWithGoogle,
} from '../real/google'
import { isRealDataMode } from '../real/mode'
import { realGetMyAccount } from '../real/player'
import { googleRegistrationSchema } from './googleRegistration.schema'
import { GOOGLE_SIGN_IN_DEADLINE } from './googleSignIn.config'
import { isGoogleDeadlinePassed, normalizeGoogleEmail, shortPlayerName } from './googleSignIn.rules'
import type {
  ConnectGoogleOutcome,
  GoogleClaimResult,
  GoogleDeadline,
  GoogleIdentity,
  GoogleRegistrationInput,
  GoogleRegistrationResult,
  GoogleSignInContext,
  GoogleSignInOutcome,
  InviteCardData,
  InviteLanding,
  InviteLink,
  InviteViewerState,
  MockInviteStanding,
} from './googleSignIn.types'

// The Google identity on the player account (P12, #909). Mock mode works on the mock store. Real
// mode (#922) goes through the Player app's Route Handlers over Supabase Auth: a real Google sign-in
// is a redirect, so by the time these run the OAuth callback has already decided the outcome and
// the server holds the verified Google account. The `google` a screen passes is display only there;
// the server never trusts it. Not connected in real mode: the Admin link (no club) and the dev stand-ins.

const OFFLINE = "You're offline. Google sign-in needs an internet connection."
const GOOGLE_FAILED = "Couldn't finish with Google. Try again."
/** Real mode, when the provider refuses a Google account without saying which one it was. */
const A_GOOGLE = 'That Google account'
const taken = (email: string) => `${email} is already used by another ROTRA account.`
const SIGN_IN = 'Sign in to connect Google.'

type State = ReturnType<typeof readMockState>
const lower = (value: string | null | undefined) => (value ?? '').toLowerCase()
/** The account Google is already connected to, then the one whose ROTRA email it is. */
function findGoogleOwners(state: State, email: string) {
  const linked = state.playerAccounts.find((a) => a.claimed && lower(a.googleEmail) === email)
  const sameEmail = state.playerAccounts.find((a) => a.claimed && lower(a.email) === email)
  return { linked, owner: linked ?? sameEmail }
}
const nameOf = (state: State, playerId: string) =>
  state.players.find((p) => p.id === playerId)?.fullName ??
  state.playerProfiles.find((p) => p.playerId === playerId)?.fullName ??
  ''

/**
 * After picking a Google account on P-LOGIN (`login`) or P-INVITE (`register`). Google never
 * links silently and never creates an account on `/login`; see `GoogleSignInOutcome`.
 */
export async function signInWithGoogle(input: {
  google: GoogleIdentity
  context: GoogleSignInContext
}): Promise<GoogleSignInOutcome> {
  if (isRealDataMode()) {
    const result = await realReadGoogleOutcome()
    if (result.outcome === 'taken') throw new MockError('conflict', taken(result.email || A_GOOGLE))
    if (result.outcome === 'connected') throw new MockError('retryable', GOOGLE_FAILED)
    return result
  }
  await delay(700)
  if (getConnectivity() === 'offline') throw new MockError('offline', OFFLINE)
  const email = normalizeGoogleEmail(input.google.email)
  const google = { email, name: input.google.name }
  const state = readMockState()
  const { linked, owner } = findGoogleOwners(state, email)
  if (linked)
    return {
      outcome: 'signed-in',
      google,
      session: startMockPlayerSession(linked.playerId, nameOf(state, linked.playerId)),
    }
  if (owner)
    return {
      outcome: 'ask-to-connect',
      google,
      playerId: owner.playerId,
      playerName: nameOf(state, owner.playerId),
    }
  if (input.context === 'login') return { outcome: 'not-connected', triedEmail: email }
  // An email clubs saved as an unclaimed player (D-2026-11-16-04): registering with it claims it.
  const saved = unclaimedAccountFor(state, [email])
  return {
    outcome: 'new-account',
    google,
    unclaimed: saved ? unclaimedIdentitiesOf(state, saved.playerId) : null,
  }
}

/** P-GOOGLE-LINK "Connect Google and sign in": the one confirmation, then connected and signed in. */
export async function confirmGoogleLink(input: { playerId: string; googleEmail: string }) {
  if (isRealDataMode()) return realConfirmGoogleLink(input)
  await delay(500)
  if (getConnectivity() === 'offline') throw new MockError('offline', OFFLINE)
  const email = normalizeGoogleEmail(input.googleEmail)
  checkMockSave()
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === input.playerId && a.claimed)
    // Only the account whose ROTRA email is this Google email may be asked; never anyone else's.
    if (!account || lower(account.email) !== email)
      throw new MockError('permission', "This Google account can't be connected here.")
    if (
      draft.playerAccounts.some(
        (a) => a.playerId !== account.playerId && lower(a.googleEmail) === email,
      )
    )
      throw new MockError('conflict', taken(email))
    account.googleEmail = email
    account.googleLinkedAt = new Date().toISOString()
  })
  const state = readMockState()
  return { session: startMockPlayerSession(input.playerId, nameOf(state, input.playerId)) }
}

/**
 * Connect or Change Google while signed in: any Google account the player owns, even with a
 * different email. The ROTRA email never changes. There is no disconnect.
 */
export async function connectGoogle(google: GoogleIdentity): Promise<ConnectGoogleOutcome> {
  if (isRealDataMode()) {
    // The connect trip to Google already happened; this reads what it decided.
    const result = await realReadGoogleOutcome()
    if (result.outcome === 'taken') return { outcome: 'taken', email: result.email || A_GOOGLE }
    const account = result.outcome === 'connected' ? await realGetMyAccount() : null
    if (!account) throw new MockError('retryable', GOOGLE_FAILED)
    return { outcome: 'connected', account }
  }
  await delay(600)
  if (getConnectivity() === 'offline') throw new MockError('offline', OFFLINE)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', SIGN_IN)
  const email = normalizeGoogleEmail(google.email)
  const playerId = session.account.id
  const { owner } = findGoogleOwners(readMockState(), email)
  if (owner && owner.playerId !== playerId) return { outcome: 'taken', email }
  checkMockSave()
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === playerId)
    if (!account) throw new MockError('permission', SIGN_IN)
    account.googleEmail = email
    account.googleLinkedAt = new Date().toISOString()
  })
  const account = myAccountOf(readMockState(), playerId)
  if (!account) throw new MockError('permission', SIGN_IN)
  return { outcome: 'connected', account }
}

/**
 * Mock rules for registration from an invite: a Google email, a phone, and the invite's club. When
 * clubs already saved that email as an unclaimed player (D-2026-11-16-04) no new player is made:
 * the person keeps the RTR ID, every club's record under the email joins the account
 * (`joinedClubs`), and the profile starts from the picked club's version (`identityRecordId`).
 */
export async function registerWithGoogle(
  input: GoogleRegistrationInput,
): Promise<GoogleRegistrationResult> {
  if (isRealDataMode()) {
    // The Admin link has no club to give the RTR ID its city yet, as with password registration.
    if (!input.clubId) throw new NotConnectedError()
    return realRegisterWithGoogle({
      ...input,
      clubId: input.clubId,
      values: googleRegistrationSchema.parse(input.values),
    })
  }
  await delay(1000)
  requireOnline()
  const email = normalizeGoogleEmail(input.google.email)
  const values = googleRegistrationSchema.parse(input.values)
  const clubId = input.clubId ?? ''
  const club = await getGuestRegistrationClub(clubId, undefined, input.sessionSlug)
  // An email clubs already saved keeps its RTR ID, so no city is asked for (D-2026-11-16-04).
  const saved = unclaimedAccountFor(readMockState(), [email])
  const city = clubId ? null : foundingCities.find((entry) => entry.code === values.cityCode)
  if (!clubId && !city && !saved)
    throw new MockError('conflict', 'Pick your city or province.', {
      cityCode: 'Pick your city or province.',
    })
  checkMockSave()
  let result: { playerId: string; rtrId: string; firstName: string } | undefined
  let matched = false
  let joinedClubs: string[] | undefined
  mockStore.update((draft) => {
    // The Google email is the ROTRA email here, so one match covers both (D-2026-11-16-04).
    const unclaimed = unclaimedAccountFor(draft, [email])
    if (
      draft.playerAccounts.some(
        (a) =>
          a.playerId !== unclaimed?.playerId &&
          (a.phone === values.phone || lower(a.email) === email || lower(a.googleEmail) === email),
      )
    ) {
      matched = true
      return
    }
    const now = new Date().toISOString()
    let id: string
    if (unclaimed) {
      // A club already saved this email: the person keeps that RTR ID and every club's record
      // under the email joins the account. No new player is made.
      id = unclaimed.playerId
      joinedClubs = claimUnclaimedPerson(draft, id, {
        phone: values.phone,
        identityRecordId: input.identityRecordId,
      }).joinedClubs
      unclaimed.email = email
      unclaimed.emailConfirmedAt = now
      unclaimed.googleEmail = email
      unclaimed.googleLinkedAt = now
      unclaimed.hasPassword = false
    } else {
      id = crypto.randomUUID()
      const location = draft.clubs.find((c) => c.id === clubId)?.locationCode ?? city?.code
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
      // The Google email is the ROTRA email, confirmed at once; there is no password.
      draft.playerAccounts.push({
        playerId: id,
        phone: values.phone,
        email,
        phoneHidden: false,
        claimed: true,
        emailConfirmedAt: now,
        googleEmail: email,
        googleLinkedAt: now,
        hasPassword: false,
      })
      draft.adminPlayerRecords[id] = {
        archivedAt: null,
        revision: 1,
        createdByClubId: clubId || null,
        adminCreated: !clubId,
      }
    }
    // D-2026-11-11-03, kept: every club's older record with this phone joins the account too.
    linkPhoneRecords(draft, id, values.phone)
    if (clubId && !draft.clubPlayers.some((p) => p.clubId === clubId && p.playerId === id)) {
      draft.clubPlayers.push({
        id: crypto.randomUUID(),
        clubId,
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
    const { phone: _phone, cityCode: _cityCode, ...personal } = values
    applyPersonalProfile(profile, personal)
    const player = draft.players.find((p) => p.id === id)
    if (player) {
      player.fullName = profile.fullName
      player.nickname = profile.nickname
    }
    result = {
      playerId: id,
      rtrId: profile.rtrId,
      firstName: shortPlayerName(profile.fullName, profile.nickname),
    }
  })
  if (matched) return { outcome: 'account-match' }
  if (!result) throw new Error('Registration produced no result.')
  return {
    outcome: 'registered',
    ...result,
    session: startMockPlayerSession(result.playerId, values.fullName),
    clubName: club.clubName,
    sessionSlug: input.sessionSlug ?? null,
    sessionTitle: club.sessionTitle ?? null,
    ...(joinedClubs ? { joinedClubs } : {}),
  }
}

/**
 * Claim a club-created profile with Google instead of a password. A profile not yet registered gets
 * the Google email as its ROTRA email, confirmed, and no password; one already registered only gets
 * Google connected and keeps its email.
 */
export async function completeClaimWithGoogle(input: {
  token: string
  google: GoogleIdentity
  values: Omit<GoogleRegistrationInput['values'], 'phone' | 'cityCode'> & { phone?: string }
}): Promise<GoogleClaimResult> {
  if (isRealDataMode()) {
    const { phone, ...rest } = input.values
    return realCompleteClaimWithGoogle({
      token: input.token,
      values: { ...personalProfileSchema.parse(rest), phone },
    })
  }
  await delay(1100)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      "You're offline, so registration wasn't sent. Your details are still here; try again when you're connected.",
    )
  const { phone: rawPhone, ...rest } = input.values
  const personal = personalProfileSchema.parse(rest)
  // Taken only when the profile has no phone on file (an unclaimed player a club saved by email).
  const phone = rawPhone?.trim() ? phoneField.safeParse(rawPhone) : null
  const email = normalizeGoogleEmail(input.google.email)
  const state = readMockState()
  const record = state.claimLinks[input.token]
  const account = record && state.playerAccounts.find((a) => a.playerId === record.playerId)
  if (
    !record ||
    !account ||
    record.status === 'expired' ||
    (record.expiresAt && Date.parse(record.expiresAt) <= Date.now())
  )
    throw new MockError('permission', 'The registration link has expired or was replaced.')
  const takenByOther = state.playerAccounts.some(
    (other) =>
      other.playerId !== account.playerId &&
      (lower(other.email) === email || lower(other.googleEmail) === email),
  )
  if (takenByOther) return { outcome: 'taken', email }
  checkMockSave()
  const wasClaimed = account.claimed
  const result = finishClaim(
    input.token,
    wasClaimed ? undefined : { email, personal, phone: phone?.success ? phone.data : undefined },
  )
  const now = new Date().toISOString()
  mockStore.update((draft) => {
    const stored = draft.playerAccounts.find((a) => a.playerId === account.playerId)
    if (!stored) return
    stored.googleEmail = email
    stored.googleLinkedAt = now
    if (!wasClaimed) {
      stored.hasPassword = false
      stored.emailConfirmedAt = now
    }
  })
  const session = startMockPlayerSession(result.playerId, nameOf(readMockState(), result.playerId))
  return { outcome: 'claimed', session, ...result }
}

/**
 * The Google deadline (one mock value in `googleSignIn.config.ts`). Mock mode follows the
 * development switch when it was set, else the date; real mode follows the date.
 */
export async function getGoogleDeadline(): Promise<GoogleDeadline> {
  const byDate = isGoogleDeadlinePassed(GOOGLE_SIGN_IN_DEADLINE.date)
  const passed = isRealDataMode() ? byDate : (readMockState().googleDeadlinePassed ?? byDate)
  return { ...GOOGLE_SIGN_IN_DEADLINE, passed }
}
/** Development switch: counts the deadline as passed (true) or not yet (false). Mock mode only. */
export async function setMockGoogleDeadline(passed: boolean) {
  if (isRealDataMode()) throw new NotConnectedError()
  mockStore.update((draft) => {
    draft.googleDeadlinePassed = passed
  })
  return getGoogleDeadline()
}

/** `<clubId>|<slug>|<invite>|<k>`: the link as one cache key, empty parts kept. */
export const inviteLinkKey = (link: InviteLink) =>
  [link.clubId, link.sessionSlug, link.sessionInviteCode, link.clubInviteCode]
    .map((part) => part ?? '')
    .join('|')

function standingOf(
  state: State,
  playerId: string,
  session: { id: string; clubId: string },
): { status: 'in' } | { status: 'waitlist'; position: number } | { status: 'request' } | null {
  const rows = new Set(
    state.clubPlayers
      .filter((p) => p.playerId === playerId && p.clubId === session.clubId && !p.removedAt)
      .map((p) => p.id),
  )
  if (state.roster.some((p) => p.sessionId === session.id && rows.has(p.clubPlayerId)))
    return { status: 'in' }
  const waiting = state.waitlist
    .filter((p) => p.sessionId === session.id)
    .sort((a, b) => a.addedAt - b.addedAt)
  const index = waiting.findIndex((p) => rows.has(p.clubPlayerId))
  if (index >= 0) return { status: 'waitlist', position: index + 1 }
  const override = state.inviteStandings?.[`${playerId}:${session.id}`]
  if (override === 'in') return { status: 'in' }
  if (override === 'waitlist') return { status: 'waitlist', position: waiting.length + 1 }
  const requested = state.joinRequests.some(
    (r) =>
      r.sessionId === session.id &&
      r.status === 'pending' &&
      (r.playerId === playerId || (!!r.clubPlayerId && rows.has(r.clubPlayerId))),
  )
  return requested ? { status: 'request' } : null
}

function inviteCard(
  state: State,
  link: InviteLink,
): {
  card: InviteCardData
  club?: State['clubs'][number]
  session?: State['sessions'][number]
  code?: State['sessionInviteCodes'][number]
} {
  if (!link.clubId && !link.sessionSlug) return { card: { kind: 'admin' } }
  const club = state.clubs.find((c) => c.id === link.clubId)
  if (!club) return { card: { kind: 'unavailable', reason: 'club' } }
  const cardClub = {
    id: club.id,
    name: club.name,
    initials: club.initials,
    logoUrl: club.logoUrl,
    city: club.city,
  }
  if (!link.sessionSlug) {
    const code = readClubInviteCode(link.clubInviteCode)
    if (code && club.inviteCode && code !== club.inviteCode.toUpperCase())
      return { card: { kind: 'unavailable', reason: 'code' } }
    const memberCount = new Set(
      state.clubPlayers
        .filter((p) => p.clubId === club.id && p.playerId && !p.removedAt)
        .map((p) => p.playerId),
    ).size
    return { card: { kind: 'club', club: cardClub, memberCount }, club }
  }
  const session = state.sessions.find(
    (s) => s.publicSlug === link.sessionSlug && s.clubId === club.id,
  )
  if (!session) return { card: { kind: 'unavailable', reason: 'session' } }
  // Session invites only work before the session starts (D-2026-11-09-11).
  if (session.state !== 'prepared') return { card: { kind: 'unavailable', reason: 'started' } }
  const wanted = (link.sessionInviteCode ?? '').trim().toLowerCase()
  const code = wanted
    ? state.sessionInviteCodes.find(
        (c) => c.sessionId === session.id && c.code.toLowerCase() === wanted,
      )
    : undefined
  const profile = code && state.playerProfiles.find((p) => p.playerId === code.playerId)
  const inviter = profile
    ? {
        playerId: profile.playerId,
        name: profile.fullName,
        shortName: shortPlayerName(profile.fullName, profile.nickname),
      }
    : null
  const query = code ? `?join=1&invite=${encodeURIComponent(code.code)}` : '?join=1'
  return {
    card: {
      kind: 'session',
      club: cardClub,
      session: {
        slug: session.publicSlug,
        title: session.title,
        startsAt: session.scheduledStartAt,
        endsAt: session.scheduledEndAt,
        venueName: session.venueName,
      },
      inviter,
      continueUrl: `${queueSessionUrl(session.publicSlug)}${query}`,
    },
    club,
    session,
    code,
  }
}

/**
 * What an invite link shows (P-INVITE) and, for a signed-in viewer, where they stand (P-JOIN-CLUB,
 * P-JOIN-SESSION). Reading it never joins anyone: a signed-in player confirmed for a session at a
 * club they aren't in does not become one of that club's saved players (owner, November 18, 2026).
 */
export async function getInviteLanding(
  link: InviteLink,
  signal?: AbortSignal,
): Promise<InviteLanding> {
  if (isRealDataMode()) {
    if (!link.clubId) throw new NotConnectedError()
    const landing = await realGetInviteLanding({ ...link, clubId: link.clubId }, signal)
    // The server doesn't know the Queue app's origin as this browser sees it.
    if (landing.card.kind === 'session')
      landing.card.continueUrl = `${queueSessionUrl(landing.card.session.slug)}?join=1`
    return landing
  }
  await delay(250, signal)
  requireOnline()
  const state = readMockState()
  const signedIn = await getSession('player')
  const { card, club, session, code } = inviteCard(state, link)
  if (!signedIn) return { card, viewer: { status: 'visitor' } }
  const who = { playerId: signedIn.account.id, name: signedIn.account.name }
  let viewer: InviteViewerState = { status: 'ready', ...who }
  if (card.kind === 'club' && club) {
    const member = state.clubPlayers.some(
      (p) => p.playerId === who.playerId && p.clubId === club.id && !p.removedAt,
    )
    if (member) viewer = { status: 'already-member', ...who }
  } else if (card.kind === 'session' && session) {
    const standing = standingOf(state, who.playerId, session)
    if (code?.playerId === who.playerId) viewer = { status: 'own-invite', ...who }
    else if (standing?.status === 'in') viewer = { status: 'already-in', ...who }
    else if (standing?.status === 'waitlist')
      viewer = { status: 'on-waitlist', ...who, position: standing.position }
    else if (standing?.status === 'request') viewer = { status: 'request-pending', ...who }
  }
  return { card, viewer }
}

/**
 * Development stand-in: puts the signed-in player on a session's roster (`in`), waitlist
 * (`waitlist`) or neither, so each "already in / on the waitlist" landing is reachable. It writes a
 * note beside the saved roster; it never touches Queue's roster or waitlist.
 */
export async function setMockInviteStanding(input: {
  sessionSlug: string
  standing: MockInviteStanding
}) {
  if (isRealDataMode()) throw new NotConnectedError()
  const session = await getSession('player')
  if (!session) throw new MockError('permission', SIGN_IN)
  mockStore.update((draft) => {
    const target = draft.sessions.find((s) => s.publicSlug === input.sessionSlug)
    if (!target) throw new MockError('permission', 'This session link is not available.')
    const key = `${session.account.id}:${target.id}`
    const next: NonNullable<MockState['inviteStandings']> = { ...draft.inviteStandings }
    if (input.standing === 'none') delete next[key]
    else next[key] = input.standing
    draft.inviteStandings = next
  })
  return { standing: input.standing }
}
