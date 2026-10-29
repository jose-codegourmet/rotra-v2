import {
  type ClubPriceValues,
  MONTHLY_PRICE_ERROR,
  YEARLY_PRICE_ERROR,
  yearlyDiscountError,
} from '@rotra/schema/club-price'
import { adminMutation } from '../admin-account/mutation'
import type { AdminAuditAction } from '../admin-audit/adminAudit.types'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { nonAdminAccounts } from '../fixtures/adminAccounts'
import { foundingCities } from '../fixtures/foundingCities'
import { accessOf, manilaToday, retentionOf } from '../license/license.rules'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import {
  adminClubAccessFilter,
  type ClubPrice,
  clubInitials,
  formatClubPriceLine,
  matchesClubSearch,
  plainIdentity,
  yearlySavingPercent,
} from './club.rules'
import type {
  AddClubInput,
  AdminClubDetail,
  AdminClubList,
  AdminClubListItem,
  AdminClubListParams,
  AdminClubRecord,
  Club,
  ClubIdentityIndex,
  ClubNameRequestList,
} from './club.types'

/** Swap this implementation for the real transport when the database epic lands. */
export async function getClub(id: string, signal?: AbortSignal): Promise<Club> {
  await delay(400, signal)
  requireOnline()
  requireClubAccess()
  const club = mockStore.getSnapshot().clubs.find((entry) => entry.id === id)
  if (!club) throw new MockError('permission', 'This club is not available.')
  return structuredClone(club)
}

// ---------- Admin: clubs, prices and name changes (A-CLUBS, A-ADD-CLUB, A-CLUB-DETAIL) ----------

const MANILA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const CLUB_NAME_MAX = 60
const CLUB_PASSWORD_MIN = 8
/** Lowercase letters and numbers, optionally separated by single dots, 3–30 characters. */
const USERNAME_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+)*$/
const NAME_TAKEN = 'A club with this name already exists.'
const USERNAME_TAKEN = 'That username is already taken.'

/**
 * The club's license access and public-page retention today, computed from its recorded terms and
 * retention record (never stored). Today is the Manila calendar date.
 */
function licenseOf(
  state: MockState,
  clubId: string,
): Pick<AdminClubListItem, 'hasTerms' | 'access' | 'retention'> {
  const terms = state.licensePayments.filter((term) => term.clubId === clubId)
  const record = state.clubRetentionRecords.find((entry) => entry.clubId === clubId)
  const today = manilaToday()
  return {
    hasTerms: terms.length > 0,
    access: accessOf(terms, today),
    retention: retentionOf(terms, record, today),
  }
}

const pendingRequestOf = (state: MockState, clubId: string) =>
  state.clubNameChangeRequests.find(
    (request) => request.clubId === clubId && request.state === 'pending',
  )

function adminClubIn(state: MockState, id: string): Club {
  const club = state.clubs.find((entry) => entry.id === id)
  if (!club) throw new MockError('permission', 'This club is not available.')
  return club
}

function adminRecordIn(state: MockState, clubId: string): AdminClubRecord {
  let record = state.adminClubRecords.find((entry) => entry.clubId === clubId)
  if (!record) {
    record = {
      clubId,
      accent: false,
      earlierNames: [],
      runningSession: null,
      expiryExceptionNote: null,
    }
    state.adminClubRecords.push(record)
  }
  return record
}

function listItemOf(state: MockState, club: Club): AdminClubListItem {
  const record = state.adminClubRecords.find((entry) => entry.clubId === club.id)
  const account = state.clubAccounts.find((entry) => entry.clubId === club.id)
  return {
    id: club.id,
    name: club.name,
    initials: club.initials,
    logoUrl: club.logoUrl,
    accent: record?.accent ?? false,
    username: account?.username ?? club.username,
    city: club.city,
    cityCode: club.cityCode,
    licensePricing: club.licensePricing,
    licenseMonthlyMinor: club.licenseMonthlyMinor,
    licenseYearlyMinor: club.licenseYearlyMinor,
    ...licenseOf(state, club.id),
    runningSessionTitle: record?.runningSession?.title ?? null,
    nameRequest: pendingRequestOf(state, club.id)?.requestedName ?? null,
    earlierNames: record?.earlierNames ?? [],
  }
}

/** Swap this implementation for the real transport when the database epic lands. */
export async function listAdminClubs(
  params: AdminClubListParams = {},
  signal?: AbortSignal,
): Promise<AdminClubList> {
  await delay(400, signal)
  const state = readMockState()
  const all = state.clubs.map((club) => listItemOf(state, club))
  const counts: AdminClubList['counts'] = { all: all.length, active: 0, expired: 0, none: 0 }
  for (const club of all) counts[adminClubAccessFilter(club.access)] += 1
  const access = params.access ?? 'all'
  return {
    clubs: all.filter(
      (club) =>
        (access === 'all' || adminClubAccessFilter(club.access) === access) &&
        matchesClubSearch(club, params.q),
    ),
    counts,
  }
}

export async function getAdminClub(id: string, signal?: AbortSignal): Promise<AdminClubDetail> {
  await delay(400, signal)
  const state = readMockState()
  const club = adminClubIn(state, id)
  const item = listItemOf(state, club)
  const record = state.adminClubRecords.find((entry) => entry.clubId === id)
  const account = state.clubAccounts.find((entry) => entry.clubId === id)
  const request = pendingRequestOf(state, id)
  const provisionedAt = account?.provisionedAt ?? ''
  return {
    ...item,
    foundingAddress: club.foundingAddress,
    account: {
      username: item.username,
      provisionedAt,
      setUpOn: provisionedAt ? MANILA_DAY.format(new Date(provisionedAt)) : '',
    },
    yearlySavingPercent: yearlySavingPercent(club),
    priceLine: formatClubPriceLine(club),
    pendingNameRequest: request
      ? { id: request.id, requestedName: request.requestedName, requestedAt: request.requestedAt }
      : null,
    runningSession: record?.runningSession ?? null,
    expiryExceptionNote: record?.expiryExceptionNote ?? null,
  }
}

function identityIndexOf(state: MockState): ClubIdentityIndex {
  return {
    names: state.clubs.map((club) => club.name),
    usernames: [
      ...new Set([
        ...state.clubAccounts.map((account) => account.username),
        ...nonAdminAccounts.map((account) => account.identifier),
      ]),
    ],
  }
}

/** Taken club names and usernames, including accounts that are not clubs (A01.3). */
export async function getClubIdentityIndex(signal?: AbortSignal): Promise<ClubIdentityIndex> {
  await delay(300, signal)
  return identityIndexOf(readMockState())
}

/** Same rules as the Admin price fields; the server rechecks what the form already checked. */
function priceErrors(price: ClubPriceValues): Record<string, string> {
  if (price.pricing === 'free') return {}
  const whole = (minor: number) => Number.isInteger(minor) && minor > 0 && minor % 100 === 0
  const errors: Record<string, string> = {}
  if (!whole(price.monthly)) errors['price.monthly'] = MONTHLY_PRICE_ERROR
  if (!whole(price.yearly)) errors['price.yearly'] = YEARLY_PRICE_ERROR
  else if (whole(price.monthly) && price.yearly >= price.monthly * 12)
    errors['price.yearly'] = yearlyDiscountError(price.monthly)
  return errors
}

function throwFieldErrors(kind: 'permission' | 'conflict', errors: Record<string, string>) {
  const first = Object.values(errors)[0]
  if (first) throw new MockError(kind, first, errors)
}

/**
 * Creates the club, its account and its price in one idempotent command: the same sourceCommandId
 * returns the club it already created. No license is recorded, and the password is never stored.
 */
export function addClub(
  input: AddClubInput,
  sourceCommandId: string,
): Promise<{ clubId: string; name: string }> {
  return adminMutation(1000, (draft) => {
    const replay = draft.adminCommands[sourceCommandId]
    if (replay) return { clubId: replay.clubId, name: adminClubIn(draft, replay.clubId).name }
    const name = input.name.trim(),
      foundingAddress = input.foundingAddress.trim(),
      username = input.username.trim(),
      city = foundingCities.find((entry) => entry.code === input.cityCode)
    const errors: Record<string, string> = { ...priceErrors(input.price) }
    if (!name) errors.name = 'Enter the club name.'
    else if (name.length > CLUB_NAME_MAX) errors.name = 'Keep the name under 60 characters.'
    if (!foundingAddress) errors.foundingAddress = 'Enter the address where the club was founded.'
    if (!city) errors.cityCode = 'Choose the founding city.'
    if (!USERNAME_PATTERN.test(username) || username.length < 3 || username.length > 30)
      errors.username = 'Use 3 to 30 lowercase letters, numbers and dots, like lahug.smash.'
    if (input.password.length < CLUB_PASSWORD_MIN) errors.password = 'Use at least 8 characters.'
    throwFieldErrors('permission', errors)
    // Uniqueness is rechecked at commit: another save may have taken the name since review.
    const taken = identityIndexOf(draft)
    const takenErrors: Record<string, string> = {}
    if (taken.names.some((entry) => plainIdentity(entry) === plainIdentity(name)))
      takenErrors.name = NAME_TAKEN
    if (taken.usernames.some((entry) => plainIdentity(entry) === plainIdentity(username)))
      takenErrors.username = USERNAME_TAKEN
    throwFieldErrors('conflict', takenErrors)
    if (!city) throw new MockError('permission', 'Choose the founding city.')
    const id = crypto.randomUUID()
    const club: Club = {
      id,
      name,
      initials: clubInitials(name),
      foundingAddress,
      city: city.name,
      locationCode: city.code,
      cityCode: city.code,
      licensePricing: input.price.pricing,
      // A new Free club keeps any valid amounts typed for Paid; otherwise 0 means "not set", never
      // an invented price (database open decision #245).
      licenseMonthlyMinor: input.price.monthly ?? 0,
      licenseYearlyMinor: input.price.yearly ?? 0,
      currency: 'PHP',
      logoUrl: null,
      description: '',
      courtRules: null,
      postTemplate: null,
      defaultPlayersPerCourt: 8,
      defaultEntranceFeeMinor: null,
      username,
      pendingNameChange: null,
    }
    draft.clubs.push(club)
    draft.clubAccounts.push({ clubId: id, username, provisionedAt: new Date().toISOString() })
    adminRecordIn(draft, id)
    draft.adminCommands[sourceCommandId] = { clubId: id }
    appendAdminAudit(draft, {
      action: 'club_created',
      targetType: 'club',
      targetId: id,
      summary: `Set up the club account ${username}. Price: ${formatClubPriceLine(club)}.`,
    })
    return { clubId: id, name }
  })
}

/**
 * Changes the price later payments start from. Free keeps the last paid amounts so switching back
 * starts from them; recorded license terms are never touched. Saving the same price changes nothing.
 */
export function changeClubPrice(
  clubId: string,
  price: ClubPriceValues,
): Promise<{ changed: boolean; priceLine: string }> {
  return adminMutation(800, (draft) => {
    const club = adminClubIn(draft, clubId)
    throwFieldErrors('permission', priceErrors(price))
    const before = formatClubPriceLine(club)
    const next: ClubPrice =
      price.pricing === 'free'
        ? {
            licensePricing: 'free',
            licenseMonthlyMinor: club.licenseMonthlyMinor,
            licenseYearlyMinor: club.licenseYearlyMinor,
          }
        : {
            licensePricing: 'paid',
            licenseMonthlyMinor: price.monthly,
            licenseYearlyMinor: price.yearly,
          }
    if (
      next.licensePricing === club.licensePricing &&
      next.licenseMonthlyMinor === club.licenseMonthlyMinor &&
      next.licenseYearlyMinor === club.licenseYearlyMinor
    )
      return { changed: false, priceLine: before }
    club.licensePricing = next.licensePricing
    club.licenseMonthlyMinor = next.licenseMonthlyMinor
    club.licenseYearlyMinor = next.licenseYearlyMinor
    const after = formatClubPriceLine(club)
    appendAdminAudit(draft, {
      action: 'club_price_changed',
      targetType: 'club',
      targetId: clubId,
      summary: `Changed price from ${before} to ${after}.`,
    })
    return { changed: true, priceLine: after }
  })
}

/**
 * Approves the club's pending name change: the name changes everywhere, the old one is kept as an
 * earlier name and the initials follow. With no pending request (already decided) nothing changes.
 */
export function approveClubNameChange(
  clubId: string,
): Promise<{ changed: boolean; name: string }> {
  return adminMutation(900, (draft) => {
    const club = adminClubIn(draft, clubId)
    const request = pendingRequestOf(draft, clubId)
    if (!request) return { changed: false, name: club.name }
    const requested = plainIdentity(request.requestedName)
    if (draft.clubs.some((other) => other.id !== clubId && plainIdentity(other.name) === requested))
      throw new MockError('conflict', NAME_TAKEN)
    const old = club.name
    adminRecordIn(draft, clubId).earlierNames.push(old)
    club.name = request.requestedName
    club.initials = clubInitials(club.name)
    club.pendingNameChange = null
    request.state = 'approved'
    request.reviewedAt = new Date().toISOString()
    appendAdminAudit(draft, {
      action: 'club_name_change_approved',
      targetType: 'club',
      targetId: clubId,
      summary: `Approved name change: ${old} → ${club.name}.`,
    })
    return { changed: true, name: club.name }
  })
}

/** Rejects the pending name change; the club keeps its name. Already decided → nothing changes. */
export function rejectClubNameChange(
  clubId: string,
): Promise<{ changed: boolean; name: string }> {
  return adminMutation(800, (draft) => {
    const club = adminClubIn(draft, clubId)
    const request = pendingRequestOf(draft, clubId)
    if (!request) return { changed: false, name: club.name }
    club.pendingNameChange = null
    request.state = 'rejected'
    request.reviewedAt = new Date().toISOString()
    appendAdminAudit(draft, {
      action: 'club_name_change_rejected',
      targetType: 'club',
      targetId: clubId,
      summary: `Rejected name change to ${request.requestedName}. Kept ${club.name}.`,
    })
    return { changed: true, name: club.name }
  })
}

const NAME_DECISIONS: AdminAuditAction[] = [
  'club_name_change_approved',
  'club_name_change_rejected',
]

/** A-CLUB-NAMES: pending requests newest first, and up to six recent decisions from the record. */
export async function listClubNameRequests(signal?: AbortSignal): Promise<ClubNameRequestList> {
  await delay(400, signal)
  const state = readMockState()
  const pending = state.clubNameChangeRequests
    .filter((request) => request.state === 'pending')
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
    .flatMap((request) => {
      const club = state.clubs.find((entry) => entry.id === request.clubId)
      if (!club) return []
      const item = listItemOf(state, club)
      return [
        {
          requestId: request.id,
          clubId: club.id,
          clubName: club.name,
          initials: club.initials,
          logoUrl: club.logoUrl,
          accent: item.accent,
          username: item.username,
          requestedName: request.requestedName,
          requestedAt: request.requestedAt,
        },
      ]
    })
  const recentlyDecided = state.adminAuditEvents
    .filter((event) => event.targetType === 'club' && NAME_DECISIONS.includes(event.action))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6)
  return { pending, recentlyDecided }
}
