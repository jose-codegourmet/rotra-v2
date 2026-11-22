import { formatPeso } from '@rotra/schema/money'
import type { SlotTransferStatus, TransferLinkState } from './slotTransfer.types'

/**
 * Slot transfer rules (#1011, D-2026-11-22-03) shared by the mock store and the real services, so
 * both refuse with the same words. A transfer is only possible while the session is Prepared (before
 * Start); Start expires every pending one and Cancel session cancels them.
 */

export const TRANSFER_STARTED_ERROR = 'The session has started. Slot transfers close at the start.'
export const TRANSFER_NOT_CONFIRMED_ERROR = 'Only confirmed players can transfer their slot.'
export const TRANSFER_ALREADY_PENDING_ERROR = 'Your transfer request is already sent.'
export const TRANSFER_NOT_FOUND_ERROR = 'No registered ROTRA player has that RTR ID.'
export const TRANSFER_RTR_ID_ERROR = 'Enter the full RTR ID, like RTR-PH-CEB-102926-0001.'
export const TRANSFER_SELF_ERROR = "That's your own RTR ID."
export const TRANSFER_ALREADY_DECIDED_ERROR = 'This transfer request has already been decided.'
export const TRANSFER_SENDER_GONE_ERROR = 'The sender no longer has this slot. Reject the request.'
export const TRANSFER_LEVEL_ERROR = 'Choose a level for this club before approving.'

/** The recipient already holds a slot here: blocked at request and checked again at approval. */
export const transferRecipientConfirmedError = (name: string) =>
  `${name} already has a slot in this session.`

/**
 * Why this recipient cannot take the slot, or null when they can. A waitlisted recipient can: the
 * approval promotes them out of the waitlist.
 */
export function transferRecipientBlock(input: {
  senderPlayerId: string
  recipientPlayerId: string
  recipientName: string
  recipientConfirmed: boolean
}): string | null {
  if (input.recipientPlayerId === input.senderPlayerId) return TRANSFER_SELF_ERROR
  if (input.recipientConfirmed) return transferRecipientConfirmedError(input.recipientName)
  return null
}

// ---------- Transfer links (#1012, D-2026-11-22-04) ----------

/** A link token: 32 random bytes in base64url (43 characters), like the registration claim links. */
export const TRANSFER_LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/
export const isTransferLinkToken = (value: unknown): value is string =>
  typeof value === 'string' && TRANSFER_LINK_TOKEN.test(value)

export const TRANSFER_LINK_CLOSED_ERROR =
  'This transfer link no longer works. Ask the sender for a new link.'
export const TRANSFER_LINK_CLAIMED_ERROR = 'Someone else already claimed this transfer link.'
export const TRANSFER_LINK_OWN_ERROR =
  "This is your own transfer link. Send it to the player who'll take your slot."
export const TRANSFER_LINK_EXPIRED_ERROR =
  'This transfer link has expired. Transfer links stop working when the session starts.'
export const TRANSFER_LINK_CANCELLED_ERROR =
  'This session was cancelled, so the transfer link no longer works.'
export const TRANSFER_CLAIM_CONFIRMED_ERROR =
  "You already have a slot in this session, so you can't claim this one."
export const TRANSFER_CLAIM_CLOSED_ERROR = 'Your claim on this slot is already closed.'

/** The `/s/<slug>?transfer=<token>` link the sender shares. */
export const transferLinkUrl = (origin: string, slug: string, token: string) =>
  `${origin}/s/${encodeURIComponent(slug)}?transfer=${encodeURIComponent(token)}`

/**
 * The link's state for the person who opened it, the same in mock and real mode. A link works
 * exactly while its transfer is pending and the session is Prepared.
 */
export function transferLinkState(input: {
  status: SlotTransferStatus
  sessionState: string
  senderPlayerId: string
  recipientPlayerId: string | null
  viewerPlayerId: string | null
}): TransferLinkState {
  const mine = !!input.viewerPlayerId && input.recipientPlayerId === input.viewerPlayerId
  if (input.status === 'approved') return mine ? 'approved' : 'closed'
  if (input.status === 'cancelled' || input.sessionState === 'cancelled') return 'cancelled'
  if (
    input.status === 'expired' ||
    (input.status === 'pending' && input.sessionState !== 'prepared')
  )
    return 'expired'
  if (input.status !== 'pending') return 'closed'
  if (input.viewerPlayerId && input.viewerPlayerId === input.senderPlayerId) return 'own'
  if (mine) return 'yours'
  return input.recipientPlayerId ? 'claimed' : 'open'
}

/** Why a claim is refused for a link in this state, or null when it may be claimed. */
export function transferLinkClaimError(state: TransferLinkState): string | null {
  switch (state) {
    case 'open':
      return null
    case 'yours':
    case 'approved':
    case 'claimed':
      return TRANSFER_LINK_CLAIMED_ERROR
    case 'own':
      return TRANSFER_LINK_OWN_ERROR
    case 'expired':
      return TRANSFER_LINK_EXPIRED_ERROR
    case 'cancelled':
      return TRANSFER_LINK_CANCELLED_ERROR
    default:
      return TRANSFER_LINK_CLOSED_ERROR
  }
}

/** Toasts, the same in mock and real mode. */
export const transferSentToast = (recipientName: string) =>
  `Transfer to ${recipientName} sent · the QM decides`
export const TRANSFER_WITHDRAWN_TOAST = 'Transfer request withdrawn'
export const transferApprovedToast = (senderName: string, recipientName: string, waivedMinor = 0) =>
  `${senderName}'s slot now belongs to ${recipientName}${waivedMinor ? ` · ${formatPeso(waivedMinor)} waived` : ''}`
export const transferRejectedToast = (senderName: string) =>
  `Transfer rejected · ${senderName} keeps the slot`
export const TRANSFER_LINK_CREATED_TOAST = 'Transfer link ready · share it with the new player'
export const TRANSFER_LINK_CANCELLED_TOAST = 'Transfer link cancelled'
export const TRANSFER_CLAIMED_TOAST = 'Slot claimed · the QM decides'
export const TRANSFER_CLAIM_WITHDRAWN_TOAST = 'Claim withdrawn · this link no longer works'
