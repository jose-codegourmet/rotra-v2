import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { isRtrId, normalizeRtrId } from '../player/rtrId'
import { isUnclaimedPerson } from '../player/unclaimed'
import { isListedInDirectory } from '../player/visibility.rules'
import { playerWrite } from '../public-session/playerMutations'
import { playerSlot } from '../public-session/publicSession.rules'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import { isRealDataMode } from '../real/mode'
import {
  realFindTransferRecipient,
  realRequestSlotTransfer,
  realWithdrawSlotTransfer,
} from '../real/slot-transfer'
import { slotTransfersOf } from './closeSlotTransfers'
import {
  TRANSFER_ALREADY_PENDING_ERROR,
  TRANSFER_NOT_CONFIRMED_ERROR,
  TRANSFER_NOT_FOUND_ERROR,
  TRANSFER_RTR_ID_ERROR,
  TRANSFER_STARTED_ERROR,
  TRANSFER_WITHDRAWN_TOAST,
  transferRecipientBlock,
  transferSentToast,
} from './slotTransfer.rules'
import type {
  FindTransferRecipientInput,
  RequestSlotTransferInput,
  TransferRecipient,
} from './slotTransfer.types'

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

/** **Withdraw request** on the sender's own pending transfer; the slot stays theirs. */
export function withdrawSlotTransfer(slug: string, input: PlayerSessionInput) {
  if (isRealDataMode()) return realWithdrawSlotTransfer(slug)
  return playerWrite(
    slug,
    (s, session) => {
      const row = senderSlot(s, session, input.playerId)
      const pending = slotTransfersOf(s).find((t) => t.pid === row.id && t.status === 'pending')
      if (!pending) fail('This transfer request is already closed.', 'conflict')
      pending.status = 'withdrawn'
      pending.decidedAt = Date.now()
      return { transferId: pending.id }
    },
    TRANSFER_WITHDRAWN_TOAST,
  )
}
