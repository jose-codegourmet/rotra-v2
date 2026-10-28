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
