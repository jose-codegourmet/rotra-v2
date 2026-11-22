import type {
  ApproveSlotTransferInput,
  DecideSlotTransferInput,
  TransferRecipient,
} from '../slot-transfer/slotTransfer.types'
import { realRequest } from './client'
import { playerPost } from './public-session'
import { accepted } from './queue'

/**
 * Real-mode transport for Transfer my slot (#1011, D-2026-11-22-03). The signed-in Player's find,
 * send and withdraw are credentialed calls to the Player app on its paired origin, like I can't
 * make it; the Queue Master's Approve and Reject go to the Queue app's Route Handlers beside the
 * drop-out notices. Online only (`realRequest` refuses offline).
 */

// ---------- Signed-in Player on the session page ----------

/** **Find**: the recipient by exact RTR ID. A POST so the RTR ID never sits in a URL. */
export function realFindTransferRecipient(slug: string, rtrId: string) {
  return playerPost<TransferRecipient>(slug, 'slot-transfer/lookup', { rtrId })
}

/** **Send transfer request**; the transfer id is fresh per tap, so a retried reply saves one request. */
export async function realRequestSlotTransfer(slug: string, rtrId: string) {
  const done = await playerPost<{ transferId: string; message: string }>(slug, 'slot-transfer', {
    transferId: crypto.randomUUID(),
    rtrId,
  })
  return { savedOffline: false, message: done.message, data: { transferId: done.transferId } }
}

/** **Withdraw request** on the Player's own pending transfer. */
export async function realWithdrawSlotTransfer(slug: string) {
  const done = await playerPost<{ transferId: string; message: string }>(
    slug,
    'slot-transfer/withdraw',
    {},
  )
  return { savedOffline: false, message: done.message, data: { transferId: done.transferId } }
}

// ---------- Queue Master (Requests) ----------

const transferPath = (input: DecideSlotTransferInput, action: 'approve' | 'reject') =>
  `/api/sessions/${encodeURIComponent(input.sessionId)}/requests/transfers/${encodeURIComponent(input.transferId)}/${action}`

/** **Approve** with the chosen level: toast “SENDER's slot now belongs to RECIPIENT”. */
export async function realApproveSlotTransfer(input: ApproveSlotTransferInput) {
  const done = await realRequest<{ transferId: string; message: string }>(
    transferPath(input, 'approve'),
    { method: 'POST', body: { level: input.level } },
  )
  return accepted(null, done.message)
}

/** **Reject**: toast “Transfer rejected · SENDER keeps the slot”. */
export async function realRejectSlotTransfer(input: DecideSlotTransferInput) {
  const done = await realRequest<{ transferId: string; message: string }>(
    transferPath(input, 'reject'),
    { method: 'POST', body: {} },
  )
  return accepted(null, done.message)
}
