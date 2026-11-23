import type { PlayingLevel } from '../player/player.types'
import type { SlotTransferStep, TransferPaymentSnapshot } from './transferAccounting.rules'

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
  /**
   * The registered ROTRA player picked by RTR ID, or the first signed-in claimant of a transfer link
   * (#1012). Null only for a link nobody has claimed yet; set once.
   */
  recipientPlayerId: string | null
  /**
   * Transfer link (#1012): the SHA-256 digest (hex) of the link's token, never the token. Missing or
   * null for a transfer made by RTR ID. The link works exactly while the transfer is pending.
   */
  linkTokenDigest?: string | null
  /** When the link's first signed-in claimant took it; null until then and for an RTR ID transfer */
  claimedAt?: number | null
  /** Who withdrew it: the sender, or a link's claimant withdrawing their claim (#1012) */
  withdrawnByPlayerId?: string | null
  /** Set on approval: the recipient's saved player and the roster row that now holds the slot */
  recipientClubPlayerId: string | null
  recipientPid: string | null
  /** Set on approval: the recipient came off the waitlist */
  recipientWasWaitlisted: boolean | null
  /**
   * Set on approval (#1013), never changed after: the amount due, the slot's cash collected so far,
   * earlier waivers and the automatic waiver this approval recorded. Missing before #1013.
   */
  payment?: TransferPaymentSnapshot | null
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
  /** The recipient claimed a transfer link (#1012) rather than being picked by RTR ID */
  viaLink?: boolean
  /**
   * What Approve would record now (#1013), shown before approving: the slot's cash, earlier
   * waivers and the automatic waiver. Missing on a server from before #1013.
   */
  payment?: TransferPaymentSnapshot
  at: number
}

/**
 * A Payments row whose slot came by approved transfer (#1013): the slot's waivers and the chain,
 * oldest first. Its payment is locked (read-only history).
 */
export type SlotPaymentTransfer = {
  waivedMinor: number
  steps: SlotTransferStep[]
}

/**
 * The sender's own pending transfer on My night. A transfer link nobody has claimed yet (#1012) has
 * no recipient: `recipientName` and `recipientRtrId` are null and `viaLink` is true.
 */
export type MySlotTransfer = {
  id: string
  recipientName: string | null
  recipientRtrId: string | null
  /** Made as a transfer link (#1012); missing on a server from before links reads false */
  viaLink?: boolean
  at: number
}

/**
 * What a transfer link (#1012) shows the person who opened it, from the viewer's side:
 * - `open`: nobody has claimed it; a signed-in player can claim it (`claimBlock` says when not)
 * - `yours`: the viewer claimed it and the Queue Master has not decided yet (Withdraw claim)
 * - `approved`: the viewer claimed it and the Queue Master approved: the slot is theirs
 * - `claimed`: someone else claimed it first
 * - `own`: the viewer is the sender
 * - `closed`: rejected, withdrawn or approved for someone else, or an unknown token: ask for a new link
 * - `expired`: the session started (links stop working at the start)
 * - `cancelled`: the whole session was cancelled
 */
export type TransferLinkState =
  | 'open'
  | 'yours'
  | 'approved'
  | 'claimed'
  | 'own'
  | 'closed'
  | 'expired'
  | 'cancelled'

export type TransferLinkView = {
  state: TransferLinkState
  /** The sender's public (masked) name, as the session page shows names; null for an unknown link */
  senderName: string | null
  /** While `open` and signed in: why this viewer cannot claim (already has a slot here), else null */
  claimBlock: string | null
}

/** The opaque token from `?transfer=` and the signed-in viewer (mock identity), or null */
export type TransferLinkInput = { token: string; playerId: string | null }
export type ClaimTransferLinkInput = { token: string; playerId: string }
/** A new transfer link: the plaintext token is returned once and never stored */
export type CreatedTransferLink = { transferId: string; token: string }

export type RequestSlotTransferInput = { playerId: string; rtrId: string }
export type FindTransferRecipientInput = { playerId: string; rtrId: string }
export type DecideSlotTransferInput = { sessionId: string; transferId: string }
export type ApproveSlotTransferInput = DecideSlotTransferInput & {
  level: PlayingLevel
  /**
   * The waiver the Queue Master saw (#1013); the approval is refused when the slot's payment changed
   * since, so nobody approves a waiver they did not see. Omitted: no check.
   */
  expectedWaiverMinor?: number
}
/**
 * **Reject and refund** (#1014): the full refund the Queue Master confirmed (the slot's whole cash);
 * refused when the slot's payment changed since. Omitted: no check.
 */
export type RejectAndRefundSlotTransferInput = DecideSlotTransferInput & {
  expectedRefundMinor?: number
}
