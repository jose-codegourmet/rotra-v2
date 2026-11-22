import { appOrigin } from '../app-origins'
import type { MockSession, SignInInput } from '../auth/auth.types'
import { clubInitials } from '../club/club.rules'
import type { Club } from '../club/club.types'
import type {
  ClubPlayerDetails,
  ClubPlayerDetailsInput,
  ClubPlayerDetailsResult,
  DeleteImpact,
} from '../club-player/clubPlayer.types'
import type { ClubPlayerView } from '../club-player/fetchers'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import {
  deviceDownloadOf,
  deviceDownloadRecords,
  downloadErrorOf,
  isDownloading,
} from '../device/deviceIndex'
import type { SaveInventoryItemInput } from '../inventory/fetchers'
import type { InventoryItem } from '../inventory/inventory.types'
import type { ClubAccess } from '../license/license.types'
import type { PlayingLevel } from '../player/player.types'
import type { ParticipantStatsRead } from '../public-session/publicSession.types'
import type {
  DownloadState,
  QueueSession,
  QueueSessionInput,
  QueueSessionSummary,
  SessionCourt,
} from '../queue-session/queueSession.types'
import { hostRegistrationText } from '../session-host/rules'
import type { SessionHostRegistration } from '../session-host/sessionHost.types'
import { levelLabel, queueMasterName } from '../session-roster/sessionRoster.rules'
import type {
  DirectoryPlayer,
  PlayerLookup,
  SessionJoinRequest,
  SessionNoShow,
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
export function accepted<T>(data: T, text: string): SaveOutcome & { data: T } {
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
  revision: string
  id: string
  name: string
  logoRef: string | null
  defaultPlayersPerCourt: number
  defaultEntranceFee: WireMoney
  description: string
  courtRules: string
  postTemplate: string | null
  /** Missing on a server from before self check-in was connected: reads as on */
  selfCheckInEnabled?: boolean
  foundingAddress: string
  city: string
  cityCode: string
  username: string
  inviteCode: string
  licensePricing: 'paid' | 'free'
  licenseMonthly: WireMoney
  licenseYearly: WireMoney
  pendingNameChange: { requestedName: string; requestedAt: string } | null
}

export async function realGetClub(signal?: AbortSignal): Promise<Club> {
  const { club } = await realRequest<{ club: WireClubSettings }>('/api/club', { signal })
  return {
    id: club.id,
    name: club.name,
    initials: clubInitials(club.name),
    logoUrl: club.logoRef,
    revision: club.revision,
    description: club.description,
    courtRules: club.courtRules || null,
    postTemplate: club.postTemplate,
    selfCheckInEnabled: club.selfCheckInEnabled !== false,
    defaultPlayersPerCourt: club.defaultPlayersPerCourt,
    defaultEntranceFeeMinor: minorOf(club.defaultEntranceFee),
    foundingAddress: club.foundingAddress,
    city: club.city,
    cityCode: club.cityCode,
    locationCode: club.cityCode,
    username: club.username,
    inviteCode: club.inviteCode,
    pendingNameChange: club.pendingNameChange
      ? {
          requestedName: club.pendingNameChange.requestedName,
          requestedAt: msOf(club.pendingNameChange.requestedAt),
        }
      : null,
    licensePricing: club.licensePricing,
    licenseMonthlyMinor: minorOf(club.licenseMonthly) ?? 0,
    licenseYearlyMinor: minorOf(club.licenseYearly) ?? 0,
    currency: 'PHP',
  }
}

/** Q-CLUB: success means both the image upload and the database update completed. */
export async function realUpdateClubLogo(input: {
  logoUrl: string | null
  expectedRevision?: string
}) {
  await realRequest('/api/club', { method: 'PATCH', body: input })
  return accepted(null, input.logoUrl === null ? 'Club logo removed' : 'Club logo updated')
}

/** Q-CLUB › Players can check themselves in (D-2026-11-09-03): the club's switch for I'm here. */
export async function realUpdateSelfCheckIn(input: { enabled: boolean }) {
  const { revision } = await realGetClub()
  await realRequest('/api/club', {
    method: 'PATCH',
    body: { selfCheckInEnabled: input.enabled, expectedRevision: revision },
  })
  return accepted(
    null,
    input.enabled ? 'Players can check themselves in' : 'Only you mark presence now',
  )
}

/** Q-CLUB › Regenerate link (#712): the old link and its QR images stop working. */
export async function realRegenerateClubInvite() {
  const result = await realRequest<{ inviteCode: string }>('/api/club/invite', { method: 'POST' })
  return accepted({ inviteCode: result.inviteCode }, 'Club invite link regenerated')
}

/** Q-CLUB Facebook post: saves the given fields; `template: null` restores the default template. */
export async function realSaveFacebookPost(input: {
  template?: string | null
  description?: string
  courtRules?: string
}) {
  const { revision } = await realGetClub()
  await realRequest('/api/club', {
    method: 'PATCH',
    body: { ...input, expectedRevision: revision },
  })
  return accepted(
    null,
    input.template === null ? 'Default template restored' : 'Facebook post saved',
  )
}

// ---------- Venues (Q-VENUES) ----------

type WireVenue = {
  revision: string
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
  revision: venue.revision,
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

export async function realSaveClubVenue(
  input: Omit<ClubVenue, 'id' | 'clubId' | 'currency' | 'revision'> & {
    id?: string
    revision?: string
  },
) {
  const { venue } = await realRequest<{ venue: WireVenue }>('/api/venues', {
    method: 'POST',
    body: {
      ...input,
      id: input.id ?? crypto.randomUUID(),
      expectedRevision: input.id ? input.revision : undefined,
    },
    fields: { courtFee: 'courtFeeMinor', entranceFee: 'entranceFeeMinor' },
  })
  return accepted(venueOf(venue), input.id ? 'Venue updated' : `${venue.name} added to your venues`)
}

// ---------- Inventory (Q-INVENTORY) ----------

type WireInventoryItem = Omit<InventoryItem, 'removedAt' | 'revision'> & {
  removedAt: string | null
  revision: string
}

const inventoryItemOf = (item: WireInventoryItem): InventoryItem => ({
  id: item.id,
  clubId: item.clubId,
  name: item.name,
  category: item.category,
  unit: item.unit,
  stock: item.stock,
  unitCostMinor: item.unitCostMinor,
  currency: item.currency,
  removedAt: msOrNull(item.removedAt) ?? undefined,
  revision: item.revision,
})

/** Online only: inventory edits are not part of the offline sync change log. */
export async function realGetInventory() {
  const { items, stockValueMinor } = await realRequest<{
    items: WireInventoryItem[]
    stockValueMinor: number
  }>('/api/inventory')
  return {
    items: items.map((item) => ({ ...inventoryItemOf(item), runningLow: item.stock <= 2 })),
    stockValue: stockValueMinor,
  }
}

/** An add sends the sheet's `commandId` as the item ID, so a retried add saves one item. */
export async function realSaveInventoryItem(input: SaveInventoryItemInput) {
  const { item } = await realRequest<{ item: WireInventoryItem }>('/api/inventory', {
    method: 'POST',
    body: {
      id: input.id ?? input.commandId ?? crypto.randomUUID(),
      expectedRevision: input.id ? input.revision : undefined,
      name: input.name,
      category: input.category,
      unit: input.unit,
      stock: input.stock,
      unitCostMinor: input.unitCostMinor,
    },
    fields: { unitCost: 'unitCostMinor' },
  })
  return accepted(
    inventoryItemOf(item),
    input.id ? 'Item saved' : `${item.name} added to inventory`,
  )
}

/**
 * Sets an absolute stock through the item edit (`POST /api/inventory` with `expectedRevision`),
 * so a debounced burst is one idempotent write and a stale revision is a conflict, not a drift.
 */
export async function realSetInventoryStock(item: InventoryItem, stock: number) {
  const { item: saved } = await realRequest<{ item: WireInventoryItem }>('/api/inventory', {
    method: 'POST',
    body: {
      id: item.id,
      expectedRevision: item.revision,
      name: item.name,
      category: item.category,
      unit: item.unit,
      stock,
      unitCostMinor: item.unitCostMinor,
    },
    fields: { unitCost: 'unitCostMinor' },
  })
  return accepted(inventoryItemOf(saved), 'Stock updated')
}

export async function realStepInventoryStock(input: { id: string; delta: -1 | 1 }) {
  const { item } = await realRequest<{ item: WireInventoryItem }>(
    `/api/inventory/${encodeURIComponent(input.id)}/stock`,
    { method: 'POST', body: { delta: input.delta } },
  )
  return accepted(inventoryItemOf(item), 'Stock updated')
}

export async function realRemoveInventoryItem(id: string) {
  const { item } = await realRequest<{ item: WireInventoryItem }>(
    `/api/inventory/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
  return accepted(inventoryItemOf(item), `${item.name} removed from inventory`)
}

// ---------- Queue Sessions (Q-HOME, Q-SETUP, Q-PREPARE) ----------

export type WireSession = Omit<
  QueueSession,
  | 'scheduledStartAt'
  | 'scheduledEndAt'
  | 'startedAt'
  | 'finalizedAt'
  | 'playerRecordsUpdatedAt'
  | 'cancelledAt'
> & {
  scheduledStartAt: string
  scheduledEndAt: string
  startedAt: string | null
  finalizedAt: string | null
  cancelledAt?: string | null
}
export type WireCourt = {
  id: string
  sessionId: string
  label: string
  /** Null for older courts: the session start applies. */
  startsAt?: string | null
  openedEarlyAt?: string | null
  openUntil: string | null
  removedAt: string | null
}
export type WireSessionSummary = {
  session: WireSession
  courts: WireCourt[]
  rosterCount: number
  presentCount: number
  capacity: number
  waitlistCount: number
  courtsInUse: number
  gamesPlayed: number
  queuedCount: number
  /** The single-session read of a live session: open match requests (Match requests · N) */
  requestCount?: number
}

export const courtOf = (court: WireCourt): SessionCourt => ({
  id: court.id,
  sessionId: court.sessionId,
  label: court.label,
  startsAt: msOrNull(court.startsAt ?? null) ?? undefined,
  openedEarlyAt: msOrNull(court.openedEarlyAt ?? null),
  openUntil: msOrNull(court.openUntil),
  removedAt: msOrNull(court.removedAt),
})

export function summaryOf(wire: WireSessionSummary, downloadedHere: boolean): QueueSessionSummary {
  const { session } = wire
  return {
    ...session,
    venueId: session.venueId ?? '',
    scheduledStartAt: msOf(session.scheduledStartAt),
    scheduledEndAt: msOf(session.scheduledEndAt),
    startedAt: msOrNull(session.startedAt),
    finalizedAt: msOrNull(session.finalizedAt),
    cancelledAt: msOrNull(session.cancelledAt ?? null),
    playerRecordsUpdatedAt: null,
    courtsInUse: wire.courtsInUse,
    gamesPlayed: wire.gamesPlayed,
    presentCount: wire.presentCount,
    rosterCount: wire.rosterCount,
    capacity: wire.capacity,
    waitlistCount: wire.waitlistCount,
    queuedCount: wire.queuedCount,
    // Device-local: whether this device holds a read-only copy of the session (#477).
    downloadedHere,
  }
}

export async function realGetQueueSessions() {
  const { sessions } = await realRequest<{ sessions: WireSessionSummary[] }>('/api/sessions')
  const downloaded = new Set(
    (await deviceDownloadRecords().catch(() => [])).map((record) => record.sessionId),
  )
  return sessions.map((wire) => summaryOf(wire, downloaded.has(wire.session.id)))
}

export async function realGetQueueSession(id: string) {
  const wire = await realRequest<WireSessionSummary>(`/api/sessions/${encodeURIComponent(id)}`)
  const download = await deviceDownloadOf(id)
  return {
    ...summaryOf(wire, download !== null),
    ...(wire.requestCount === undefined ? {} : { requestCount: wire.requestCount }),
    courts: wire.courts.map(courtOf),
    downloadState: (isDownloading(id)
      ? 'downloading'
      : download
        ? 'ready'
        : 'none') as DownloadState,
    downloadedAt: download?.downloadedAt ?? null,
    downloadError: downloadErrorOf(id),
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

export async function realCreateQueueSession(input: QueueSessionInput) {
  const data = await realRequest<{
    firstSessionId: string
    created: number
    skipped: number | null
    hosts?: SessionHostRegistration | null
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
          startsAt: court.startsAt == null ? null : iso(court.startsAt),
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
    `${
      !series
        ? 'Session created'
        : `${data.created} sessions created${skipped ? ` · ${skipped} clashing date${skipped === 1 ? '' : 's'} skipped` : ''}`
    }${data.hosts ? hostRegistrationText(data.hosts) : ''}`,
  )
}

// ---------- Roster (Q-ROSTER) ----------

export type WireRosterEntry = {
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
  /** Present on the roster GET; mutations still use the stored entry DTO. */
  hasPlayedAtClubBefore?: boolean
  /** A registered player's club nickname (D-2026-11-18-03); Queue Master reads only */
  clubNickname?: string | null
  /** Set games played adjustment (#717); missing on older servers means 0 */
  gamesAdjustment?: number
  /** The Player's own I'm here / I'm leaving times (D-2026-11-09-03); missing on older servers */
  selfCheckedInAt?: string | null
  leftAt?: string | null
}
export type WireWaitlistEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel | null
  addedAt: string
  position: number
}
export type WireJoinRequest = Omit<SessionJoinRequest, 'requestedAt' | 'decidedAt'> & {
  requestedAt: string
  decidedAt: string | null
  /** Still sent by the server until D-2026-11-16-04 is built there; the screens no longer read it */
  phoneE164?: string | null
}

const rosterOf = (entry: WireRosterEntry): SessionPlayer => ({
  ...entry,
  presentChangedAt: msOf(entry.presentChangedAt),
  levelLockedAt: msOrNull(entry.levelLockedAt),
  confirmedAt: msOf(entry.confirmedAt),
  selfCheckedInAt: msOrNull(entry.selfCheckedInAt ?? null),
  leftAt: msOrNull(entry.leftAt ?? null),
})

export type WireRosterRead = {
  roster: WireRosterEntry[]
  /** No show (cancelled) entries (#839), oldest first; missing on older servers means none */
  noShows?: (WireRosterEntry & { noShowAt: string | null })[]
  waitlist: WireWaitlistEntry[]
  joinRequests: WireJoinRequest[]
}
/** The roster GET body (and the roster batch reply's `roster`) as the hooks read it. */
export function rosterReadOf(wire: WireRosterRead) {
  return {
    roster: wire.roster.map(rosterOf),
    noShows: (wire.noShows ?? []).map(
      ({ noShowAt, ...entry }): SessionNoShow => ({
        ...rosterOf(entry),
        noShowAt: msOrNull(noShowAt) ?? 0,
      }),
    ),
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
      ({ phoneE164: _phone, ...request }): SessionJoinRequest => ({
        ...request,
        requestedAt: msOf(request.requestedAt),
        decidedAt: msOrNull(request.decidedAt),
      }),
    ),
  }
}
export async function realGetSessionRoster(sessionId: string) {
  return rosterReadOf(
    await realRequest<WireRosterRead>(`/api/sessions/${encodeURIComponent(sessionId)}/roster`),
  )
}

/** The No show (cancelled) players of a live session, oldest first (#839), from the roster read. */
export async function realGetSessionNoShows(sessionId: string) {
  return (await realGetSessionRoster(sessionId)).noShows
}

type NoShowReply = { name: string; count: number; capacity: number }
const noShowPath = (input: { sessionId: string; rosterId: string }) =>
  `/api/sessions/${encodeURIComponent(input.sessionId)}/roster/${encodeURIComponent(input.rosterId)}/no-show`

/** No show (cancelled) (#839): "NAME marked No show (cancelled) · 23/24", as the mock words it. */
export async function realMarkNoShow(input: { sessionId: string; rosterId: string }) {
  const reply = await realRequest<NoShowReply>(noShowPath(input), {
    method: 'POST',
    body: { operationId: crypto.randomUUID() },
  })
  return accepted(
    null,
    `${reply.name} marked No show (cancelled) · ${reply.count}/${reply.capacity}`,
  )
}

/** Back to roster (#839): "NAME back on the roster · 24/24"; refused (409) while the roster is full. */
export async function realUndoNoShow(input: { sessionId: string; rosterId: string }) {
  const reply = await realRequest<NoShowReply>(noShowPath(input), {
    method: 'DELETE',
    body: { operationId: crypto.randomUUID() },
  })
  return accepted(null, `${reply.name} back on the roster · ${reply.count}/${reply.capacity}`)
}

export async function realAddNewPlayerToSession(input: {
  sessionId: string
  name: string
  nickname?: string
  phone?: string
  /** No email adds a guest; an email adds an unclaimed player or links one (D-2026-11-16-04) */
  email?: string
  level: PlayingLevel
  /** The outbox's on a replay (#722), else fresh */
  operationId?: string
}) {
  const result = await realRequest<{
    rosterEntry: WireRosterEntry | null
    waitlist: WireWaitlistEntry | null
    /** What the email did ("unclaimed · RTR-…"); null for a guest */
    emailWords?: string | null
  }>(`/api/sessions/${encodeURIComponent(input.sessionId)}/roster`, {
    method: 'POST',
    body: { ...input, operationId: input.operationId ?? crypto.randomUUID() },
    fields: { player: 'name' },
  })
  const waitlistPosition = result.waitlist?.position ?? null
  const clubPlayerId = result.rosterEntry?.clubPlayerId ?? result.waitlist?.clubPlayerId ?? ''
  return accepted(
    { waitlistPosition, locked: false, clubPlayerId },
    waitlistPosition
      ? `${input.name.trim()} added to the waitlist as #${waitlistPosition}`
      : result.emailWords
        ? `${input.name.trim()} added · ${result.emailWords}`
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
  return accepted(null, `${queueMasterName(entry)}: ${levelLabel(input.level)}`)
}

// ---------- Saved players and Player Information (Q-SAVED-PLAYERS, Q-ADD-PLAYER) ----------

export type WireClubPlayer = Omit<
  ClubPlayerView,
  'addedAt' | 'displayName' | 'suggestion' | 'emailOnFile' | 'detailsRequired' | 'clubNickname'
> & {
  addedAt: string
  /** A registered player's club nickname (D-2026-11-18-03); missing reads as none */
  clubNickname?: string | null
  /** D-2026-11-16-04 (P15.8); missing (an older server) reads as false */
  emailOnFile?: boolean
  detailsRequired?: boolean
}

/** The club's saved players in the Saved players view shape (`clubPlayerView`). */
export async function realGetClubPlayers(): Promise<ClubPlayerView[]> {
  const wire = await realRequest<{ players: WireClubPlayer[] }>('/api/club/players')
  return wire.players.map((p) => ({
    ...p,
    displayName: p.fullName,
    suggestion: p.playingLevel,
    addedAt: msOf(p.addedAt),
    emailOnFile: p.emailOnFile ?? false,
    detailsRequired: p.detailsRequired ?? false,
    clubNickname: p.clubNickname ?? null,
  }))
}

/** The ROTRA Player app's origin, as seen from the Queue app (localhost in local work). */
export function playerAppOrigin() {
  return appOrigin('player')
}

/**
 * Invite: the player's own registration link, for an unclaimed profile and for a guest alike
 * (D-2026-11-18-07). Registering through it claims that club record, so its games stay with the
 * person. Works once, lasts 7 days; a new link cancels the earlier one.
 */
export async function realCreatePlayerInvite(player: ClubPlayerView) {
  const { token } = await realRequest<{ token: string; expiresAt: string }>(
    `/api/club/players/${encodeURIComponent(player.id)}/registration-link`,
    { method: 'POST' },
  )
  return {
    url: `${playerAppOrigin()}/claim/${encodeURIComponent(token)}`,
    message: 'Invite link ready',
  }
}

/** Delete player (D-DELETE-PLAYER): what it would affect, then the soft delete. */
export async function realGetDeleteImpact(id: string) {
  const { impact } = await realRequest<{ impact: DeleteImpact }>(
    `/api/club/players/${encodeURIComponent(id)}/delete-impact`,
  )
  return impact
}
/** Stats · YEAR on the player profile dialog: null for guests and unclaimed records. */
export async function realGetClubPlayerYearStats(id: string, signal?: AbortSignal) {
  const { stats } = await realRequest<{ stats: ParticipantStatsRead }>(
    `/api/club/players/${encodeURIComponent(id)}/year-stats`,
    { signal },
  )
  return stats
}
export function realDeleteClubPlayer(id: string) {
  return realRequest<{ clubPlayerId: string; name: string }>(
    `/api/club/players/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

/** Edit details: what the club entered for its own guest or unclaimed player. */
export async function realGetClubPlayerDetails(id: string) {
  const { details } = await realRequest<{ details: ClubPlayerDetails }>(
    `/api/club/players/${encodeURIComponent(id)}`,
  )
  return details
}
/** Save details: the toast and, for an email another saved player has, the Same person step. */
export function realUpdateClubPlayerDetails(id: string, values: ClubPlayerDetailsInput) {
  const number = (typed: string) => (typed.trim() ? Number(typed) : null)
  return realRequest<ClubPlayerDetailsResult>(`/api/club/players/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: {
      fullName: values.fullName,
      nickname: values.nickname,
      phone: values.phone,
      email: values.email,
      playingStyle: values.playingStyle,
      experienceYears: number(values.experienceYears),
      experienceMonths: number(values.experienceMonths),
      socialLinks: {
        facebook: values.facebook,
        instagram: values.instagram,
        youtube: values.youtube,
        linkedin: values.linkedin,
      },
    },
    fields: { experience: 'experienceYears' },
  })
}

/**
 * Player lookup (D-2026-11-16-04): the one person whose RTR ID or email is exactly `q`, or this
 * club's name for them when already saved. Rank places are not computed in real mode yet.
 */
export async function realLookupPlayer(q: string): Promise<PlayerLookup> {
  const wire = await realRequest<{
    player: Omit<DirectoryPlayer, 'rankLabel'> | null
    savedName: string | null
  }>(`/api/players?q=${encodeURIComponent(q)}`)
  return {
    player: wire.player ? { ...wire.player, rankLabel: 'Not ranked' } : null,
    savedName: wire.savedName,
  }
}

/** Player lookup as the list the Add player sheet draws: the one match, or nothing. */
export async function realPlayerDirectorySearch(q: string): Promise<DirectoryPlayer[]> {
  const { player } = await realLookupPlayer(q)
  return player ? [player] : []
}

/** Same person (D-2026-11-16-04): moves the record into the saved player with that email. */
export async function realMoveSavedPlayer(input: {
  clubPlayerId: string
  intoClubPlayerId: string
  email: string
}) {
  const moved = await realRequest<{
    clubPlayerId: string
    movedClubPlayerId: string
    name: string
  }>(`/api/club/players/${encodeURIComponent(input.clubPlayerId)}/move`, {
    method: 'POST',
    body: { intoClubPlayerId: input.intoClubPlayerId, email: input.email },
  })
  return accepted(
    { clubPlayerId: moved.clubPlayerId, movedClubPlayerId: moved.movedClubPlayerId },
    `Moved to ${moved.name}`,
  )
}

/** Club nickname sheet › Save nickname (D-2026-11-18-03); the server words the toast. */
export async function realSetClubNickname(input: { clubPlayerId: string; clubNickname: string }) {
  const saved = await realRequest<{
    clubPlayerId: string
    clubNickname: string | null
    message: string
  }>(`/api/club/players/${encodeURIComponent(input.clubPlayerId)}/club-nickname`, {
    method: 'POST',
    body: { clubNickname: input.clubNickname },
  })
  return accepted(
    { clubPlayerId: saved.clubPlayerId, clubNickname: saved.clubNickname },
    saved.message,
  )
}

type RosterAdd = { rosterEntry: WireRosterEntry | null; waitlist: WireWaitlistEntry | null }

/** The add's outcome and toast, worded like the mock adds ("Mikee added · Intermediate Mid"). */
function rosterAdded(result: RosterAdd, level: PlayingLevel) {
  const waitlistPosition = result.waitlist?.position ?? null
  const clubPlayerId = result.rosterEntry?.clubPlayerId ?? result.waitlist?.clubPlayerId ?? ''
  const name = result.rosterEntry ? queueMasterName(result.rosterEntry) : 'Player'
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
  operationId?: string
}) {
  const result = await realRequest<RosterAdd>(
    `/api/sessions/${encodeURIComponent(input.sessionId)}/roster`,
    {
      method: 'POST',
      body: { ...input, source: 'saved', operationId: input.operationId ?? crypto.randomUUID() },
    },
  )
  return rosterAdded(result, input.level)
}

export async function realAddDirectoryPlayerToSession(input: {
  sessionId: string
  playerId: string
  /** This club's own name for another club's unclaimed player (`ownNameRequired`) */
  name?: string
  level: PlayingLevel
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
  /** No email saves a guest; an email an unclaimed player or a linked one (D-2026-11-16-04) */
  email?: string | null
}) {
  const saved = await realRequest<{
    clubPlayerId: string
    name: string
    emailWords?: string | null
  }>('/api/club/players', {
    method: 'POST',
    body: { ...input, operationId: crypto.randomUUID() },
  })
  return accepted(
    { clubPlayerId: saved.clubPlayerId },
    saved.emailWords
      ? `${saved.name} saved · ${saved.emailWords}`
      : `${saved.name} saved as a guest`,
  )
}

/** Saved players › Add player › Player Information: saved to the club only, with no level yet. */
export async function realAddDirectoryPlayerToClub(input: {
  playerId: string
  /** This club's own name for another club's unclaimed player (`ownNameRequired`) */
  name?: string | null
}) {
  const saved = await realRequest<{ clubPlayerId: string; name: string }>('/api/club/players', {
    method: 'POST',
    body: { ...input, source: 'directory', operationId: crypto.randomUUID() },
  })
  return accepted({ clubPlayerId: saved.clubPlayerId }, `${saved.name} saved`)
}
