import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { isRtrId, normalizeRtrId } from '../player/rtrId'
import { isUnclaimedPerson } from '../player/unclaimed'
import { isListedInDirectory } from '../player/visibility.rules'
import { playerWrite } from '../public-session/playerMutations'
import { maskPublicName, playerSlot } from '../public-session/publicSession.rules'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import { isRealDataMode } from '../real/mode'
import {
  realClaimTransferLink,
  realCreateTransferLink,
  realFindTransferRecipient,
  realReadTransferLink,
  realRequestSlotTransfer,
  realWithdrawSlotTransfer,
  realWithdrawTransferClaim,
} from '../real/slot-transfer'
import type { SaveOutcome } from '../sync/sync.types'
import { slotTransfersOf } from './closeSlotTransfers'
import {
  isTransferLinkToken,
  TRANSFER_ALREADY_PENDING_ERROR,
  TRANSFER_CLAIM_CLOSED_ERROR,
  TRANSFER_CLAIM_CONFIRMED_ERROR,
  TRANSFER_CLAIM_WITHDRAWN_TOAST,
  TRANSFER_CLAIMED_TOAST,
  TRANSFER_LINK_CANCELLED_TOAST,
  TRANSFER_LINK_CLOSED_ERROR,
  TRANSFER_LINK_CREATED_TOAST,
  TRANSFER_NOT_CONFIRMED_ERROR,
  TRANSFER_NOT_FOUND_ERROR,
  TRANSFER_RTR_ID_ERROR,
  TRANSFER_STARTED_ERROR,
  TRANSFER_WITHDRAWN_TOAST,
  transferLinkClaimError,
  transferLinkState,
  transferRecipientBlock,
  transferSentToast,
} from './slotTransfer.rules'
import type {
  ClaimTransferLinkInput,
  CreatedTransferLink,
  FindTransferRecipientInput,
  RequestSlotTransferInput,
  SlotTransfer,
  TransferLinkInput,
  TransferLinkView,
  TransferRecipient,
} from './slotTransfer.types'
import { newTransferLinkToken, transferLinkDigest } from './transferLinkToken'

/**
 * **Transfer my slot** (#1011, D-2026-11-22-03), the signed-in Player's side on the session page:
 * find the recipient by their exact RTR ID, send the request, or withdraw it while it is pending.
 * Only a confirmed Player, only while the session is Prepared. In real mode these go to the Player
 * app on its paired origin, like I can't make it; the Player app knows who is signed in.
 */

function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

type Session = MockState['sessions'][number]

function senderSlot(s: MockState, session: Session, playerId: string) {
  if (session.state !== 'prepared') fail(TRANSFER_STARTED_ERROR)
  const row = playerSlot(s, session, playerId).roster
  if (!row) fail(TRANSFER_NOT_CONFIRMED_ERROR)
  return row
}

/**
 * The recipient by exact RTR ID: a registered ROTRA player listed in Player Information, never a
 * guest or an unclaimed person. Refused when it is the sender or someone already confirmed here;
 * a waitlisted recipient is allowed (the approval promotes them).
 */
function recipientIn(
  s: MockState,
  session: Session,
  senderPlayerId: string,
  rtrId: string,
): TransferRecipient {
  if (!isRtrId(rtrId)) fail(TRANSFER_RTR_ID_ERROR)
  const player = s.players.find((p) => p.rtrId === normalizeRtrId(rtrId))
  const profile = player && s.playerProfiles.find((entry) => entry.playerId === player.id)
  if (
    !player ||
    isUnclaimedPerson(s, player.id) ||
    s.adminPlayerRecords[player.id]?.archivedAt ||
    (player.id !== senderPlayerId && !isListedInDirectory(profile))
  )
    fail(TRANSFER_NOT_FOUND_ERROR)
  const slot = playerSlot(s, session, player.id)
  const block = transferRecipientBlock({
    senderPlayerId,
    recipientPlayerId: player.id,
    recipientName: player.fullName,
    recipientConfirmed: !!slot.roster,
  })
  if (block) fail(block, 'conflict')
  const waiting = s.waitlist
    .filter((w) => w.sessionId === session.id)
    .sort((a, b) => a.addedAt - b.addedAt)
  const index = slot.waitlist ? waiting.findIndex((w) => w.id === slot.waitlist?.id) : -1
  return {
    playerId: player.id,
    fullName: player.fullName,
    nickname: player.nickname,
    rtrId: player.rtrId,
    picture: profile?.picture ?? null,
    waitlistPosition: index >= 0 ? index + 1 : null,
  }
}

const sessionBySlug = (s: MockState, slug: string) => {
  const session = s.sessions.find((x) => x.publicSlug === slug)
  if (!session) fail("This session page isn't available.")
  return session
}

/** **Find** on the Transfer my slot sheet: the recipient preview, or the refusal's words. */
export async function findTransferRecipient(
  slug: string,
  input: FindTransferRecipientInput,
): Promise<TransferRecipient> {
  if (isRealDataMode()) return realFindTransferRecipient(slug, input.rtrId)
  await delay()
  const s = readMockState()
  const session = sessionBySlug(s, slug)
  senderSlot(s, session, input.playerId)
  return recipientIn(s, session, input.playerId, input.rtrId)
}

/**
 * **Send transfer request**: one pending transfer per slot. Nothing moves until the Queue Master
 * approves; the toast is “Transfer to NAME sent · the QM decides”.
 */
export function requestSlotTransfer(slug: string, input: RequestSlotTransferInput) {
  if (isRealDataMode()) return realRequestSlotTransfer(slug, input.rtrId)
  let recipientName = ''
  return playerWrite(
    slug,
    (s, session) => {
      const row = senderSlot(s, session, input.playerId)
      if (slotTransfersOf(s).some((t) => t.pid === row.id && t.status === 'pending'))
        fail(TRANSFER_ALREADY_PENDING_ERROR, 'conflict')
      const recipient = recipientIn(s, session, input.playerId, input.rtrId)
      recipientName = recipient.fullName
      const id = crypto.randomUUID()
      s.slotTransfers = [
        ...slotTransfersOf(s),
        {
          id,
          sessionId: session.id,
          pid: row.id,
          senderClubPlayerId: row.clubPlayerId,
          senderPlayerId: input.playerId,
          recipientPlayerId: recipient.playerId,
          recipientClubPlayerId: null,
          recipientPid: null,
          recipientWasWaitlisted: null,
          status: 'pending',
          requestedAt: Date.now(),
          decidedAt: null,
        },
      ]
      return { transferId: id }
    },
    () => transferSentToast(recipientName),
  )
}

/**
 * **Withdraw request** on the sender's own pending transfer, or **Cancel link** on their transfer
 * link (#1012, claimed or not): the slot stays theirs and the link stops working.
 */
export function withdrawSlotTransfer(slug: string, input: PlayerSessionInput) {
  if (isRealDataMode()) return realWithdrawSlotTransfer(slug)
  let unclaimedLink = false
  return playerWrite(
    slug,
    (s, session) => {
      const row = senderSlot(s, session, input.playerId)
      const pending = slotTransfersOf(s).find((t) => t.pid === row.id && t.status === 'pending')
      if (!pending) fail('This transfer request is already closed.', 'conflict')
      unclaimedLink = !!pending.linkTokenDigest && !pending.recipientPlayerId
      pending.status = 'withdrawn'
      pending.decidedAt = Date.now()
      pending.withdrawnByPlayerId = input.playerId
      return { transferId: pending.id }
    },
    () => (unclaimedLink ? TRANSFER_LINK_CANCELLED_TOAST : TRANSFER_WITHDRAWN_TOAST),
  )
}

// ---------- Transfer links (#1012, D-2026-11-22-04) ----------

/**
 * **Create a transfer link** on the Transfer my slot sheet, for a recipient with no ROTRA account:
 * a pending transfer with no recipient and a fresh token. The token comes back once (the store keeps
 * only its digest); one pending transfer per slot, so a link and an RTR ID request never coexist.
 */
export async function createTransferLink(
  slug: string,
  input: PlayerSessionInput,
): Promise<SaveOutcome & { data: CreatedTransferLink }> {
  if (isRealDataMode()) return realCreateTransferLink(slug)
  const token = newTransferLinkToken()
  const digest = await transferLinkDigest(token)
  return playerWrite(
    slug,
    (s, session) => {
      const row = senderSlot(s, session, input.playerId)
      if (slotTransfersOf(s).some((t) => t.pid === row.id && t.status === 'pending'))
        fail(TRANSFER_ALREADY_PENDING_ERROR, 'conflict')
      const id = crypto.randomUUID()
      s.slotTransfers = [
        ...slotTransfersOf(s),
        {
          id,
          sessionId: session.id,
          pid: row.id,
          senderClubPlayerId: row.clubPlayerId,
          senderPlayerId: input.playerId,
          recipientPlayerId: null,
          linkTokenDigest: digest,
          claimedAt: null,
          recipientClubPlayerId: null,
          recipientPid: null,
          recipientWasWaitlisted: null,
          status: 'pending',
          requestedAt: Date.now(),
          decidedAt: null,
        },
      ]
      return { transferId: id, token }
    },
    TRANSFER_LINK_CREATED_TOAST,
  )
}

/** The transfer whose link carries this token, in this session, or null. */
async function linkedTransfer(s: MockState, session: Session, token: string) {
  if (!isTransferLinkToken(token)) return null
  const digest = await transferLinkDigest(token)
  return (
    slotTransfersOf(s).find((t) => t.sessionId === session.id && t.linkTokenDigest === digest) ??
    null
  )
}

function linkStateFor(session: Session, t: SlotTransfer, viewerPlayerId: string | null) {
  return transferLinkState({
    status: t.status,
    sessionState: session.state,
    senderPlayerId: t.senderPlayerId,
    recipientPlayerId: t.recipientPlayerId,
    viewerPlayerId,
  })
}

/**
 * The transfer link card on the session page (`?transfer=<token>`): the link's state for this
 * viewer (signed in or not) and the sender's masked name. An unknown token reads `closed`.
 */
export async function readTransferLink(
  slug: string,
  input: TransferLinkInput,
): Promise<TransferLinkView> {
  if (isRealDataMode()) return realReadTransferLink(slug, input.token)
  await delay()
  const s = readMockState()
  const session = sessionBySlug(s, slug)
  const t = await linkedTransfer(s, session, input.token)
  if (!t) return { state: 'closed', senderName: null, claimBlock: null }
  const state = linkStateFor(session, t, input.playerId)
  const sender = s.players.find((p) => p.id === t.senderPlayerId)
  const confirmed =
    state === 'open' && input.playerId && playerSlot(s, session, input.playerId).roster
  return {
    state,
    senderName: maskPublicName(sender?.fullName ?? ''),
    claimBlock: confirmed ? TRANSFER_CLAIM_CONFIRMED_ERROR : null,
  }
}

/**
 * **Claim this slot**: the first signed-in player to accept takes the link (one claimant per link);
 * the transfer then waits for the Queue Master like a request by RTR ID. Refused for the sender, for
 * anyone already confirmed here, and once someone else claimed it, the session started or it closed.
 */
export async function claimTransferLink(slug: string, input: ClaimTransferLinkInput) {
  if (isRealDataMode()) return realClaimTransferLink(slug, input.token)
  const digest = isTransferLinkToken(input.token) ? await transferLinkDigest(input.token) : null
  return playerWrite(
    slug,
    (s, session) => {
      const t = digest
        ? slotTransfersOf(s).find((x) => x.sessionId === session.id && x.linkTokenDigest === digest)
        : null
      if (!t) fail(TRANSFER_LINK_CLOSED_ERROR, 'conflict')
      const refused = transferLinkClaimError(linkStateFor(session, t, input.playerId))
      if (refused) fail(refused, 'conflict')
      if (!s.roster.some((r) => r.id === t.pid && r.sessionId === session.id))
        fail(TRANSFER_LINK_CLOSED_ERROR, 'conflict')
      if (playerSlot(s, session, input.playerId).roster)
        fail(TRANSFER_CLAIM_CONFIRMED_ERROR, 'conflict')
      t.recipientPlayerId = input.playerId
      t.claimedAt = Date.now()
      return { transferId: t.id }
    },
    TRANSFER_CLAIMED_TOAST,
  )
}

/**
 * **Withdraw claim**: the claimant gives the slot back before the Queue Master decides. The transfer
 * closes as withdrawn and the link stops working; the sender makes a new one to try again.
 */
export async function withdrawTransferClaim(slug: string, input: ClaimTransferLinkInput) {
  if (isRealDataMode()) return realWithdrawTransferClaim(slug, input.token)
  const digest = isTransferLinkToken(input.token) ? await transferLinkDigest(input.token) : null
  return playerWrite(
    slug,
    (s, session) => {
      const t = digest
        ? slotTransfersOf(s).find((x) => x.sessionId === session.id && x.linkTokenDigest === digest)
        : null
      if (!t || linkStateFor(session, t, input.playerId) !== 'yours')
        fail(TRANSFER_CLAIM_CLOSED_ERROR, 'conflict')
      t.status = 'withdrawn'
      t.decidedAt = Date.now()
      t.withdrawnByPlayerId = input.playerId
      return { transferId: t.id }
    },
    TRANSFER_CLAIM_WITHDRAWN_TOAST,
  )
}
