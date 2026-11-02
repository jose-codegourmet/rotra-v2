import type { AdminSession, AdminSignInInput } from '../admin-account/adminAccount.types'
import {
  adminClubAccessFilter,
  clubInitials,
  formatClubPriceLine,
  matchesClubSearch,
  yearlySavingPercent,
} from '../club/club.rules'
import type {
  AddClubInput,
  AdminClubDetail,
  AdminClubList,
  AdminClubListItem,
  AdminClubListParams,
  ClubIdentityIndex,
} from '../club/club.types'
import { accessOf, manilaToday, retentionOf } from '../license/license.rules'
import type {
  ActivateLicenseInput,
  ClubLicenseTerm,
  LicenseOperation,
} from '../license/license.types'
import { minorOf, RealRequestError, realRequest, type WireMoney } from './client'

/** A license term as `adminTermDto` sends it. `endsAt` is the instant access ends (exclusive). */
export type WireTerm = {
  id: string
  clubId: string
  plan: 'monthly' | 'yearly'
  startsAt: string
  endsAt: string
  activatedAt: string
  paidOn: string | null
  amount: WireMoney
  paymentReference: string
  notes: string
  sourceCommandId?: string
  /** Admin-only label, allowlisted by the Admin club-detail route. */
  activatedByDisplayName?: string
}

type WireAdminClub = {
  logoRef: string | null
  id: string
  name: string
  foundingAddress: string
  licensePricing: 'paid' | 'free'
  licenseMonthly: WireMoney
  licenseYearly: WireMoney
  username: string | null
  provisionedAt: string | null
  city: string
  cityCode: string
  terms: WireTerm[]
  pendingNameRequest: { id: string; requestedName: string; requestedAt: string } | null
  runningSession: { title: string; venueName: string; startedAt: string } | null
  earlierNames: string[]
}

/** Manila calendar day; a term's last licensed day is the day before access ends. */
export function termOf(term: WireTerm): ClubLicenseTerm {
  return {
    id: term.id,
    clubId: term.clubId,
    plan: term.plan === 'yearly' ? 'Yearly' : 'Monthly',
    startsAt: manilaToday(new Date(term.startsAt)),
    endsAt: manilaToday(new Date(Date.parse(term.endsAt) - 1)),
    amountMinor: minorOf(term.amount) ?? 0,
    currency: 'PHP',
    paidOn: term.paidOn,
    paymentReference: term.paymentReference,
    notes: term.notes || undefined,
    activatedAt: term.activatedAt,
    // The UI contract retains its existing field name; Admin receives a display label, never an ID.
    activatedByEmail: term.activatedByDisplayName ?? '',
    sourceCommandId: term.sourceCommandId ?? '',
  }
}

function listItemOf(club: WireAdminClub): AdminClubListItem {
  const terms = club.terms.map(termOf)
  const today = manilaToday()
  return {
    id: club.id,
    name: club.name,
    initials: clubInitials(club.name),
    logoUrl: club.logoRef,
    // Per-club accent selection has no persisted source; the UI uses its neutral treatment.
    accent: false,
    username: club.username ?? '',
    city: club.city,
    cityCode: club.cityCode,
    licensePricing: club.licensePricing,
    licenseMonthlyMinor: minorOf(club.licenseMonthly) ?? 0,
    licenseYearlyMinor: minorOf(club.licenseYearly) ?? 0,
    hasTerms: terms.length > 0,
    access: accessOf(terms, today),
    retention: retentionOf(terms, undefined, today),
    runningSessionTitle: club.runningSession?.title ?? null,
    nameRequest: club.pendingNameRequest?.requestedName ?? null,
    earlierNames: club.earlierNames,
  }
}

const MANILA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export async function realListAdminClubs(
  params: AdminClubListParams,
  signal?: AbortSignal,
): Promise<AdminClubList> {
  const { clubs } = await realRequest<{ clubs: WireAdminClub[] }>('/api/clubs', { signal })
  const all = clubs.map(listItemOf)
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

export async function realGetAdminClub(
  id: string,
  signal?: AbortSignal,
): Promise<AdminClubDetail | null> {
  let club: WireAdminClub
  try {
    club = (
      await realRequest<{ club: WireAdminClub }>(`/api/clubs/${encodeURIComponent(id)}`, { signal })
    ).club
  } catch (error) {
    // Unknown IDs show Club not found, as the mock does; other failures stay errors.
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
  const item = listItemOf(club)
  const provisionedAt = club.provisionedAt ?? ''
  return {
    ...item,
    foundingAddress: club.foundingAddress,
    account: {
      username: item.username,
      provisionedAt,
      setUpOn: provisionedAt ? MANILA_DAY.format(new Date(provisionedAt)) : '',
    },
    yearlySavingPercent: yearlySavingPercent(item),
    priceLine: formatClubPriceLine(item),
    pendingNameRequest: club.pendingNameRequest,
    runningSession: club.runningSession,
    expiryExceptionNote: null,
  }
}

export function realGetClubIdentityIndex(signal?: AbortSignal) {
  return realRequest<ClubIdentityIndex>('/api/clubs/identity', { signal })
}

export async function realAddClub(input: AddClubInput, sourceCommandId: string) {
  return realRequest<{ clubId: string; name: string }>('/api/clubs', {
    method: 'POST',
    body: { ...input, sourceCommandId },
    fields: { club: 'name', location: 'cityCode', price: 'price.monthly' },
  })
}

export async function realActivateLicense(input: ActivateLicenseInput): Promise<LicenseOperation> {
  const before = await realListLicenseTerms(input.clubId)
  const { term } = await realRequest<{ term: WireTerm }>(
    `/api/clubs/${encodeURIComponent(input.clubId)}/licenses`,
    { method: 'POST', body: input },
  )
  const recorded = termOf({ ...term, sourceCommandId: input.sourceCommandId })
  const repeat = before.some((t) => t.id === recorded.id)
  const earlier = before.filter((t) => t.id !== recorded.id)
  return { term: recorded, verb: earlier.length || repeat ? 'Renewed' : 'Activated' }
}

export async function realListLicenseTerms(clubId: string, signal?: AbortSignal) {
  const detail = await realRequest<{ club: WireAdminClub }>(
    `/api/clubs/${encodeURIComponent(clubId)}`,
    { signal },
  )
  return detail.club.terms.map(termOf)
}

export async function realGetLicenseOperation(sourceCommandId: string, signal?: AbortSignal) {
  const { operation } = await realRequest<{
    operation: { term: WireTerm; first: boolean } | null
  }>(`/api/license-operations/${encodeURIComponent(sourceCommandId)}`, { signal })
  if (!operation) return null
  return {
    term: termOf(operation.term),
    verb: operation.first ? 'Activated' : 'Renewed',
  } satisfies LicenseOperation
}

export function realGetAdminSession() {
  return realRequest<AdminSession>('/api/auth/session')
}

export function realSignInAdmin(input: AdminSignInInput) {
  return realRequest<AdminSession>('/api/auth/sign-in', {
    method: 'POST',
    body: { identifier: input.email, password: input.password },
  })
}

export function realSignOutAdmin(input?: { sessionEnded?: boolean }) {
  return realRequest<AdminSession>('/api/auth/sign-out', { method: 'POST', body: input ?? {} })
}
