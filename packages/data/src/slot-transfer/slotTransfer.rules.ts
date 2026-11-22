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

/** Toasts, the same in mock and real mode. */
export const transferSentToast = (recipientName: string) =>
  `Transfer to ${recipientName} sent · the QM decides`
export const TRANSFER_WITHDRAWN_TOAST = 'Transfer request withdrawn'
export const transferApprovedToast = (senderName: string, recipientName: string) =>
  `${senderName}'s slot now belongs to ${recipientName}`
export const transferRejectedToast = (senderName: string) =>
  `Transfer rejected · ${senderName} keeps the slot`
