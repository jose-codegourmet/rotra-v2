import type { PlayingLevel } from '../player/player.types'

/**
 * A slot transfer's status (#1011, D-2026-11-22-03). `pending` until the Queue Master decides;
 * `approved` / `rejected` by the Queue Master; `withdrawn` by the sender; `expired` when the session
 * started while it was pending; `cancelled` when the whole session was cancelled. Final once it
 * leaves `pending`.
 */
export type SlotTransferStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'cancelled'

/**
 * **Transfer my slot** (#1011): a confirmed signed-in Player asks to hand their slot to another
 * registered ROTRA player, before the start. The Queue Master approves (the slot changes hands in
 * one write; capacity unchanged) or rejects (nothing changes). One pending transfer per slot.
 * Kept on the record in every state.
 */
export type SlotTransfer = {
  id: string
  sessionId: string
  /** The sender's roster row (`SessionPlayer.id`): the slot being transferred */
  pid: string
  senderClubPlayerId: string
  senderPlayerId: string
  /** The registered ROTRA player picked by RTR ID */
  recipientPlayerId: string
  /** Set on approval: the recipient's saved player and the roster row that now holds the slot */
  recipientClubPlayerId: string | null
  recipientPid: string | null
  /** Set on approval: the recipient came off the waitlist */
  recipientWasWaitlisted: boolean | null
  status: SlotTransferStatus
  requestedAt: number
  /** When it left `pending` */
  decidedAt: number | null
}

/** A recipient found by exact RTR ID on the Transfer my slot sheet. Never a phone or an email. */
export type TransferRecipient = {
  playerId: string
  fullName: string
  nickname: string | null
  rtrId: string
  /** Their own profile picture as an avatar reference, or null for initials */
  picture: string | null
  /** 1-based place on this session's waitlist, or null when not waitlisted */
  waitlistPosition: number | null
}

/** The Queue Master's Requests row for one pending transfer. */
export type SlotTransferView = {
  id: string
  sessionId: string
  /** The sender's roster row, for the avatar */
  pid: string
  senderName: string
  senderNickname: string | null
  recipientPlayerId: string
  recipientName: string
  recipientRtrId: string
  /** The recipient's place on the waitlist (1-based), or null when they are not waitlisted */
  recipientWaitlistPosition: number | null
  /** The level the approval presets: their waitlist level, else their saved level here, else null */
  suggestedLevel: PlayingLevel | null
  at: number
}

/** The sender's own pending transfer on My night. */
export type MySlotTransfer = {
  id: string
  recipientName: string
  recipientRtrId: string
  at: number
}

export type RequestSlotTransferInput = { playerId: string; rtrId: string }
export type FindTransferRecipientInput = { playerId: string; rtrId: string }
export type DecideSlotTransferInput = { sessionId: string; transferId: string }
export type ApproveSlotTransferInput = DecideSlotTransferInput & { level: PlayingLevel }
