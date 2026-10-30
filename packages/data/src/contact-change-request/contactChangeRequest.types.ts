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
