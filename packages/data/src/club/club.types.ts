import type { ClubPriceValues } from '@rotra/schema/club-price'
import type { AdminAuditEvent } from '../admin-audit/adminAudit.types'
import type { ClubAccessState, RetentionState } from '../license/license.types'

/** Shared club identity and prototype license prices; all amounts are integer centavos. */
export type Club = {
  logoUrl: string | null
  description: string
  courtRules: string | null
  postTemplate: string | null
  defaultPlayersPerCourt: number
  defaultEntranceFeeMinor: number | null
  cityCode: string
  username: string
  pendingNameChange: { requestedName: string; requestedAt: number } | null
  id: string
  name: string
  initials: string
  foundingAddress: string
  city: string
  locationCode: string
  licensePricing: 'paid' | 'free'
  licenseMonthlyMinor: number
  licenseYearlyMinor: number
  currency: 'PHP'
}

/** The club's dedicated Queue sign-in (club_accounts). The password stays with the credential provider. */
export type ClubAccount = {
  clubId: string
  username: string
  /** ISO timestamp the platform owner set the account up */
  provisionedAt: string
}

export type ClubNameChangeState = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** A club's request for a new name (club_name_change_requests); one pending per club. */
export type ClubNameChangeRequest = {
  id: string
  clubId: string
  requestedName: string
  /** ISO timestamp */
  requestedAt: string
  state: ClubNameChangeState
  /** ISO timestamp the platform owner approved or rejected it */
  reviewedAt?: string
}

/** The session running under a club right now, as Admin shows it. */
export type AdminClubRunningSession = { title: string; venueName: string; startedAt: string }

/**
 * Admin-only club facts the mock keeps beside the shared Club: the prototype's accent logo, names the
 * club had before approved name changes (oldest first), the running session and the expiry exception.
 */
export type AdminClubRecord = {
  clubId: string
  accent: boolean
  earlierNames: string[]
  runningSession: AdminClubRunningSession | null
  /** Why a session ran past the license end (shown in place of the running session) */
  expiryExceptionNote: string | null
}

/**
 * The directory's access filter (rotra-admin.html filterKey): a scheduled license counts as
 * 'none' because the club has no access yet.
 */
export type AdminClubAccessFilter = 'all' | 'active' | 'expired' | 'none'

export type AdminClubListParams = { q?: string; access?: AdminClubAccessFilter }

/** One A-CLUBS row. Amounts are integer centavos. */
export type AdminClubListItem = {
  id: string
  name: string
  initials: string
  logoUrl: string | null
  accent: boolean
  username: string
  city: string
  cityCode: string
  licensePricing: 'paid' | 'free'
  licenseMonthlyMinor: number
  licenseYearlyMinor: number
  /** Whether any term was ever recorded (Renew license vs Activate license) */
  hasTerms: boolean
  /** Computed from the terms and today, never stored */
  access: ClubAccessState
  /** Public pages and their deletion countdown (A-RETENTION), computed like access */
  retention: RetentionState
  runningSessionTitle: string | null
  /** The requested new name while a request is pending */
  nameRequest: string | null
  earlierNames: string[]
}

/** The rows that match q and access, plus per-filter counts over every club (prototype seg counts). */
export type AdminClubList = {
  clubs: AdminClubListItem[]
  counts: Record<AdminClubAccessFilter, number>
}

/** A-CLUB-DETAIL: identity, account, price, pending name change and Overview facts. */
export type AdminClubDetail = AdminClubListItem & {
  foundingAddress: string
  account: {
    username: string
    provisionedAt: string
    /** 'YYYY-MM-DD' (Manila) the account was set up */
    setUpOn: string
  }
  /** Whole-percent saving of the yearly price over twelve months */
  yearlySavingPercent: number
  /** "₱1,500 a month · ₱15,000 a year (17% off)" or "Free (tester club)" */
  priceLine: string
  pendingNameRequest: { id: string; requestedName: string; requestedAt: string } | null
  runningSession: AdminClubRunningSession | null
  expiryExceptionNote: string | null
}

/** Taken club names and account usernames, so A-ADD-CLUB can refuse a duplicate before review. */
export type ClubIdentityIndex = { names: string[]; usernames: string[] }

/** A-ADD-CLUB's reviewed values. The password goes to the credential provider and is never stored. */
export type AddClubInput = {
  name: string
  foundingAddress: string
  cityCode: string
  username: string
  password: string
  price: ClubPriceValues
}

/** One club waiting on a name decision (A-CLUB-NAMES list). */
export type ClubNameRequestListItem = {
  requestId: string
  clubId: string
  clubName: string
  initials: string
  logoUrl: string | null
  accent: boolean
  username: string
  requestedName: string
  requestedAt: string
}

/** Pending requests newest first, and up to six recently decided ones from the audit record. */
export type ClubNameRequestList = {
  pending: ClubNameRequestListItem[]
  recentlyDecided: AdminAuditEvent[]
}
