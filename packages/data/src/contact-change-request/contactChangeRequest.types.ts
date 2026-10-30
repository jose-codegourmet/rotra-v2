/** Which login contact a request changes. */
export type ContactChangeField = 'phone' | 'email'

/** Mirrors player_contact_change_requests.status. 'approved' and 'applying' both mean not yet applied. */
export type ContactChangeStatus =
  | 'pending'
  | 'approved'
  | 'applying'
  | 'applied'
  | 'rejected'
  | 'failed'

/** A player's request to change their login phone or email; it takes effect only after Admin approval. */
export type ContactChangeRequest = {
  requestId: string
  playerId: string
  field: ContactChangeField
  /** Display form; phone as '+63 9XX XXX XXXX' */
  fromValue: string
  toValue: string
  status: ContactChangeStatus
  /** Epoch ms */
  requestedAt: number
}

/** Statuses that block a new request (one open request at a time). */
export const OPEN_CONTACT_CHANGE_STATUSES: readonly ContactChangeStatus[] = [
  'pending',
  'approved',
  'applying',
  'failed',
]

/** Where the request came from: the player's signed-in account, or the owner typed it in for them. */
export type ContactChangeSource = 'app' | 'owner'

/**
 * The Admin review's view of a request (rotra-admin.html seedRequests): the player request plus its
 * source and the decision/application times. All times are epoch ms.
 */
export type AdminContactChangeRequest = ContactChangeRequest & {
  source: ContactChangeSource
  approvedAt?: number
  appliedAt?: number
  /** When a rejected request was declined */
  decidedAt?: number
  /** Why an approved change couldn't be applied (status 'failed') */
  error?: string
}

/** Another player identity, named on screen by name and RTR ID only (never by its phone or email). */
export type ContactCheckPlayer = { id: string; fullName: string; rtrId: string }

/**
 * One pre-approval check on a pending request (rotra-admin.html checks()). `ok: false` blocks Approve;
 * the details say why. Computed upstream (A03.6), never in the component.
 */
export type ContactCheck =
  /** The requested contact already belongs to another player */
  | { kind: 'linked-elsewhere'; ok: boolean; otherPlayer?: ContactCheckPlayer }
  /** The same player sent a newer open request for this field */
  | { kind: 'newer-request'; ok: boolean; newerRequestId?: string; sentAt?: number }
  /** The player's applied contact no longer matches the request's `fromValue` ('' = not set) */
  | { kind: 'original-changed'; ok: boolean; currentValue?: string }
  /** Another contact change for this player is still being applied */
  | { kind: 'in-progress'; ok: boolean }

/**
 * The stored record (player_contact_change_requests): what the player sees plus the Admin fields.
 * Approval and application are separate steps, because the sign-in provider and the database can't
 * change in one transaction.
 */
export type PlayerContactChangeRequest = AdminContactChangeRequest & {
  /**
   * The contact the request was made against, normalized (E.164 phone, lowercase email; '' = not
   * set). The mock compares contacts directly; the database stores a contact revision instead.
   */
  originalContactRevision: string
  /**
   * Idempotency key for applying at the sign-in provider: set on approval and kept by every retry,
   * so a retry never creates a second identity or request. null until approved.
   */
  providerOperationRef: string | null
}

/** The next permitted action on a request (rotra-admin.html nextAction()). */
export type ContactRequestNextAction =
  | 'Review'
  | 'Review · blocked'
  | 'Check status'
  | 'Retry application'
  | 'View'

/** The A-CONTACT-REQUESTS status filter. 'applying' also holds 'approved' (both not yet applied). */
export type ContactRequestFilter =
  | 'pending'
  | 'applying'
  | 'failed'
  | 'applied'
  | 'rejected'
  | 'all'

/** Requests per filter, and `attention` = waiting for review + needs attention (the nav count). */
export type ContactRequestCounts = Record<ContactRequestFilter, number> & { attention: number }

/** The player a request belongs to, with the contacts in use right now (applied only; phone E.164). */
export type ContactRequestPlayer = ContactCheckPlayer & {
  nickname: string | null
  claimed: boolean
  phone?: string
  email?: string
}

/** One row of the review list; `blocked` = waiting for review with a failing check. */
export type AdminContactRequestItem = PlayerContactChangeRequest & {
  player: ContactRequestPlayer
  blocked: boolean
  nextAction: ContactRequestNextAction
}

/** A-CONTACT-REVIEW: the row plus its checks, which exist only while it waits for review. */
export type AdminContactRequestDetail = AdminContactRequestItem & { checks: ContactCheck[] | null }

export type ContactRequestListParams = {
  status?: ContactRequestFilter
  /** Only this player's requests (A-PLAYER-DETAIL) */
  playerId?: string
}

/** Rows newest first; counts cover every request (of the player, when `playerId` is given). */
export type AdminContactRequestList = {
  rows: AdminContactRequestItem[]
  counts: ContactRequestCounts
}
