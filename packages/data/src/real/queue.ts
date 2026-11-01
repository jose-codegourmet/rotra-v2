import type { MockSession, SignInInput } from '../auth/auth.types'
import { clubInitials } from '../club/club.rules'
import type { Club } from '../club/club.types'
import type { ClubPlayerView } from '../club-player/fetchers'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import type { ClubAccess } from '../license/license.types'
import { MockError } from '../mock/errors'
import type { PlayingLevel } from '../player/player.types'
import type {
  QueueSession,
  QueueSessionInput,
  QueueSessionSummary,
  SessionCourt,
} from '../queue-session/queueSession.types'
import { levelLabel, shortName } from '../session-roster/sessionRoster.rules'
import type {
  DirectoryPlayer,
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../session-roster/sessionRoster.types'
import { saveToastText } from '../sync/fetchers'
import type { SaveOutcome } from '../sync/sync.types'
import { termOf, type WireTerm } from './admin'
import { minorOf, msOf, msOrNull, realRequest, type WireMoney } from './client'

// ---------- Auth (Q-LOGIN) ----------

export function realGetClubSession() {
  return realRequest<MockSession | null>('/api/auth/session')
}
export function realSignInClub(input: SignInInput) {
  return realRequest<MockSession>('/api/auth/sign-in', {
    method: 'POST',
    body: { identifier: input.identifier, password: input.password },
  })
}
export function realSignOutClub() {
  return realRequest<null>('/api/auth/sign-out', { method: 'POST', body: {} })
}

/** A save the server accepted: never "saved offline" in this journey (offline sync is not wired). */
function accepted<T>(data: T, text: string): SaveOutcome & { data: T } {
  return { savedOffline: false, message: saveToastText(text, { savedOffline: false }), data }
}

// ---------- License gate and club (Q-ACCESS, Q-CLUB) ----------

type WireLicense = { accessEndsAt: string | null; active: boolean; payments: WireTerm[] }

const readLicense = async () =>
  (await realRequest<{ license: WireLicense }>('/api/license')).license

export async function realGetClubAccess(): Promise<ClubAccess> {
  const license = await readLicense()
  const sessions = await realGetQueueSessions()
  return {
    status: license.active ? 'active' : 'expired',
    activeSessionId: sessions.find((s) => s.state === 'active')?.id ?? null,
  }
}

export async function realGetLicensePayments() {
  const license = await readLicense()
  return license.payments.map(termOf).sort((a, b) => (b.paidOn ?? '').localeCompare(a.paidOn ?? ''))
}

type WireClubSettings = {
  id: string
  name: string
  logoRef: string | null
  defaultPlayersPerCourt: number
  defaultEntranceFee: WireMoney
  description: string
  courtRules: string
  postTemplate: string | null
}

/** Q-CLUB / dashboard header. Founding city, username and name requests are not on the wire yet. */
export async function realGetClub(signal?: AbortSignal): Promise<Club> {
  const { club } = await realRequest<{ club: WireClubSettings }>('/api/club', { signal })
  return {
    id: club.id,
    name: club.name,
    initials: clubInitials(club.name),
    logoUrl: null,
    description: club.description,
    courtRules: club.courtRules || null,
    postTemplate: club.postTemplate,
    defaultPlayersPerCourt: club.defaultPlayersPerCourt,
    defaultEntranceFeeMinor: minorOf(club.defaultEntranceFee),
    foundingAddress: '',
    city: '',
    cityCode: '',
    locationCode: '',
    username: '',
    pendingNameChange: null,
    licensePricing: 'paid',
    licenseMonthlyMinor: 0,
    licenseYearlyMinor: 0,
    currency: 'PHP',
  }
}

// ---------- Venues (Q-VENUES) ----------

type WireVenue = {
  id: string
  clubId: string
  name: string
  address: string
  courtFeePerCourtHour: WireMoney
  entranceFee: WireMoney
}

const venueOf = (venue: WireVenue): ClubVenue => ({
  id: venue.id,
  clubId: venue.clubId,
  name: venue.name,
  address: venue.address,
  courtFeeMinor: minorOf(venue.courtFeePerCourtHour),
  entranceFeeMinor: minorOf(venue.entranceFee),
  currency: 'PHP',
})

export async function realGetClubVenues() {
  const [{ venues }, sessions] = await Promise.all([
    realRequest<{ venues: WireVenue[] }>('/api/venues'),
    realGetQueueSessions(),
  ])
  const now = Date.now()
  return venues.map((venue) => {
    const here = sessions.filter((s) => s.venueId === venue.id)
    return {
      ...venueOf(venue),
      sessionsHere: here.length,
      nextSession:
        here
          .filter((s) => s.state === 'prepared' && s.scheduledStartAt > now)
          .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt)[0] ?? null,
    }
  })
}

/** Create only: editing a venue needs its revision on `ClubVenue` first (gap logged). */
export async function realSaveClubVenue(
  input: Omit<ClubVenue, 'id' | 'clubId' | 'currency'> & { id?: string },
) {
  if (input.id)
    throw new MockError('permission', "Editing a saved venue isn't connected to saved data yet.")
  const { venue } = await realRequest<{ venue: WireVenue }>('/api/venues', {
    method: 'POST',
    body: { ...input, id: crypto.randomUUID() },
    fields: { courtFee: 'courtFeeMinor', entranceFee: 'entranceFeeMinor' },
  })
  return accepted(venueOf(venue), `${venue.name} added to your venues`)
}

// ---------- Queue Sessions (Q-HOME, Q-SETUP, Q-PREPARE) ----------

type WireSession = Omit<
  QueueSession,
  'scheduledStartAt' | 'scheduledEndAt' | 'startedAt' | 'finalizedAt' | 'playerRecordsUpdatedAt'
> & {
  scheduledStartAt: string
  scheduledEndAt: string
  startedAt: string | null
  finalizedAt: string | null
}
type WireCourt = {
  id: string
  sessionId: string
  label: string
  openUntil: string | null
  removedAt: string | null
}
type WireSessionSummary = {
  session: WireSession
  courts: WireCourt[]
  rosterCount: number
  presentCount: number
  capacity: number
  waitlistCount: number
}

const courtOf = (court: WireCourt): SessionCourt => ({
  id: court.id,
  sessionId: court.sessionId,
  label: court.label,
  openUntil: msOrNull(court.openUntil),
  removedAt: msOrNull(court.removedAt),
})

/** Matches are not wired yet, so courts in use, games and queued matches are 0 (truthful here). */
function summaryOf(wire: WireSessionSummary): QueueSessionSummary {
  const { session } = wire
  return {
    ...session,
    venueId: session.venueId ?? '',
    scheduledStartAt: msOf(session.scheduledStartAt),
    scheduledEndAt: msOf(session.scheduledEndAt),
    startedAt: msOrNull(session.startedAt),
    finalizedAt: msOrNull(session.finalizedAt),
    playerRecordsUpdatedAt: null,
    courtsInUse: 0,
    gamesPlayed: 0,
    presentCount: wire.presentCount,
    rosterCount: wire.rosterCount,
    capacity: wire.capacity,
    waitlistCount: wire.waitlistCount,
    queuedCount: 0,
    downloadedHere: false,
  }
}

export async function realGetQueueSessions() {
  const { sessions } = await realRequest<{ sessions: WireSessionSummary[] }>('/api/sessions')
  return sessions.map(summaryOf)
}

export async function realGetQueueSession(id: string) {
  const wire = await realRequest<WireSessionSummary>(`/api/sessions/${encodeURIComponent(id)}`)
  return {
    ...summaryOf(wire),
    courts: wire.courts.map(courtOf),
    downloadState: 'none' as const,
    downloadedAt: null,
    downloadError: undefined,
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

export async function realCreateQueueSession(input: QueueSessionInput) {
  const data = await realRequest<{
    firstSessionId: string
    created: number
    skipped: number | null
  }>('/api/sessions', {
    method: 'POST',
    body: {
      commandId: crypto.randomUUID(),
      input: {
        ...input,
        scheduledStartAt: iso(input.scheduledStartAt),
        scheduledEndAt: iso(input.scheduledEndAt),
        courts: input.courts.map((court) => ({
          label: court.label,
          openUntil: court.openUntil == null ? null : iso(court.openUntil),
        })),
      },
    },
    fields: { session: 'title' },
  })
  const skipped = data.skipped ?? 0
  const series = input.repeat && input.repeat !== 'none'
  return accepted(
    { firstSessionId: data.firstSessionId, created: data.created, skipped },
    !series
      ? 'Session created'
      : `${data.created} sessions created${skipped ? ` · ${skipped} clashing date${skipped === 1 ? '' : 's'} skipped` : ''}`,
  )
}

// ---------- Roster (Q-ROSTER) ----------

type WireRosterEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  nameSnapshot: string
  nicknameSnapshot: string | null
  present: boolean
  presentChangedAt: string
  level: PlayingLevel | null
  levelLockedAt: string | null
  confirmedAt: string
}
type WireWaitlistEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel | null
  addedAt: string
  position: number
}
type WireJoinRequest = Omit<SessionJoinRequest, 'requestedAt' | 'decidedAt'> & {
  requestedAt: string
  decidedAt: string | null
}

const rosterOf = (entry: WireRosterEntry): SessionPlayer => ({
  ...entry,
  presentChangedAt: msOf(entry.presentChangedAt),
  levelLockedAt: msOrNull(entry.levelLockedAt),
  confirmedAt: msOf(entry.confirmedAt),
})

export async function realGetSessionRoster(sessionId: string) {
  const wire = await realRequest<{
    roster: WireRosterEntry[]
    waitlist: WireWaitlistEntry[]
    joinRequests: WireJoinRequest[]
  }>(`/api/sessions/${encodeURIComponent(sessionId)}/roster`)
  return {
    roster: wire.roster.map(rosterOf),
    waitlist: wire.waitlist.map(
      (entry): SessionWaitlistEntry => ({
        id: entry.id,
        sessionId: entry.sessionId,
        clubPlayerId: entry.clubPlayerId,
        level: entry.level,
        addedAt: msOf(entry.addedAt),
      }),
    ),
    joinRequests: wire.joinRequests.map(
      (request): SessionJoinRequest => ({
        ...request,
        requestedAt: msOf(request.requestedAt),
        decidedAt: msOrNull(request.decidedAt),
      }),
    ),
  }
}

export async function realAddNewPlayerToSession(input: {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  level: PlayingLevel
}) {
  const result = await realRequest<{
    rosterEntry: WireRosterEntry | null
    waitlist: WireWaitlistEntry | null
  }>(`/api/sessions/${encodeURIComponent(input.sessionId)}/roster`, {
    method: 'POST',
    body: { ...input, operationId: crypto.randomUUID() },
    fields: { player: 'name' },
  })
  const waitlistPosition = result.waitlist?.position ?? null
  const clubPlayerId = result.rosterEntry?.clubPlayerId ?? result.waitlist?.clubPlayerId ?? ''
  return accepted(
    { waitlistPosition, locked: false, clubPlayerId },
    waitlistPosition
      ? `${input.name.trim()} added to the waitlist as #${waitlistPosition}`
      : input.phone?.trim()
        ? `${input.name.trim()} added · profile lookup after sync`
        : `${input.name.trim()} added as a guest`,
  )
}

export async function realSetRosterLevel(input: {
  sessionId: string
  rosterId: string
  level: PlayingLevel
}) {
  const entry = await realRequest<WireRosterEntry>(
    `/api/sessions/${encodeURIComponent(input.sessionId)}/roster/${encodeURIComponent(input.rosterId)}/level`,
    { method: 'POST', body: { level: input.level, operationId: crypto.randomUUID() } },
  )
  return accepted(null, `${shortName(entry)}: ${levelLabel(input.level)}`)
}

// ---------- Saved players and Player Information (Q-SAVED-PLAYERS, Q-ADD-PLAYER) ----------

type WireClubPlayer = Omit<ClubPlayerView, 'addedAt' | 'displayName' | 'suggestion'> & {
  addedAt: string
}

/** The club's saved players in the Saved players view shape (`clubPlayerView`). */
export async function realGetClubPlayers(): Promise<ClubPlayerView[]> {
  const wire = await realRequest<{ players: WireClubPlayer[] }>('/api/club/players')
  return wire.players.map((p) => ({
    ...p,
    displayName: p.fullName,
    suggestion: p.playingLevel,
    addedAt: msOf(p.addedAt),
  }))
}

/** Player Information results: profiles with an RTR ID the club has not saved yet. */
export async function realPlayerDirectorySearch(q: string): Promise<DirectoryPlayer[]> {
  const wire = await realRequest<{ players: Omit<DirectoryPlayer, 'rankLabel'>[] }>(
    `/api/players?q=${encodeURIComponent(q)}`,
  )
  return wire.players.map((p) => ({ ...p, rankLabel: 'Not ranked' }))
}

type RosterAdd = { rosterEntry: WireRosterEntry | null; waitlist: WireWaitlistEntry | null }

/** The add's outcome and toast, worded like the mock adds ("Mikee added · Intermediate Mid"). */
function rosterAdded(result: RosterAdd, level: PlayingLevel) {
  const waitlistPosition = result.waitlist?.position ?? null
  const clubPlayerId = result.rosterEntry?.clubPlayerId ?? result.waitlist?.clubPlayerId ?? ''
  const name = result.rosterEntry ? shortName(result.rosterEntry) : 'Player'
  return accepted(
    { waitlistPosition, locked: false, clubPlayerId },
    waitlistPosition
      ? `${name} added to the waitlist as #${waitlistPosition} · ${levelLabel(level)}`
      : `${name} added · ${levelLabel(level)}`,
  )
}

export async function realAddSavedPlayerToSession(input: {
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel
  identityCheck?: string
}) {
  const result = await realRequest<RosterAdd>(
    `/api/sessions/${encodeURIComponent(input.sessionId)}/roster`,
    { method: 'POST', body: { ...input, source: 'saved', operationId: crypto.randomUUID() } },
  )
  return rosterAdded(result, input.level)
}

export async function realAddDirectoryPlayerToSession(input: {
  sessionId: string
  playerId: string
  level: PlayingLevel
  identityCheck?: string
}) {
  const result = await realRequest<RosterAdd>(
    `/api/sessions/${encodeURIComponent(input.sessionId)}/roster`,
    { method: 'POST', body: { ...input, source: 'directory', operationId: crypto.randomUUID() } },
  )
  return rosterAdded(result, input.level)
}

/** Saved players › Add player › New player: saved to the club only. */
export async function realAddNewSavedPlayer(input: {
  name: string
  nickname?: string | null
  phone?: string | null
}) {
  const saved = await realRequest<{ clubPlayerId: string; name: string }>('/api/club/players', {
    method: 'POST',
    body: { ...input, operationId: crypto.randomUUID() },
  })
  return accepted(
    { clubPlayerId: saved.clubPlayerId },
    input.phone?.trim()
      ? `${saved.name} saved · profile lookup after sync`
      : `${saved.name} saved as a guest`,
  )
}

/** Saved players › Add player › Player Information: saved to the club only, with no level yet. */
export async function realAddDirectoryPlayerToClub(input: { playerId: string }) {
  const saved = await realRequest<{ clubPlayerId: string; name: string }>('/api/club/players', {
    method: 'POST',
    body: { ...input, source: 'directory', operationId: crypto.randomUUID() },
  })
  return accepted({ clubPlayerId: saved.clubPlayerId }, `${saved.name} saved`)
}
