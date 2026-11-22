import type { MockState } from '../mock/store'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { pendingSlotTransfers } from './closeSlotTransfers'
import type { MySlotTransfer, SlotTransferView } from './slotTransfer.types'

/**
 * The Queue Master's Slot transfers list (#1011): this session's pending transfers, oldest first,
 * whose sender still holds the slot. The recipient's waitlist place and the level the approval
 * presets (their waitlist level, else their saved level in this club) come from the store now.
 * A transfer link nobody has claimed yet (#1012) is not listed: there is nobody to approve.
 */
export function slotTransferViews(
  state: MockState,
  sessionId: string,
  rosterById: ReadonlyMap<string, SessionPlayer>,
): SlotTransferView[] {
  const session = state.sessions.find((s) => s.id === sessionId)
  if (!session) return []
  const waiting = state.waitlist
    .filter((w) => w.sessionId === sessionId)
    .sort((a, b) => a.addedAt - b.addedAt)
  return pendingSlotTransfers(state, sessionId).flatMap((t) => {
    const sender = rosterById.get(t.pid)
    const recipient = state.players.find((p) => p.id === t.recipientPlayerId)
    if (!sender || !recipient) return []
    const saved = state.clubPlayers.find(
      (p) => p.clubId === session.clubId && p.playerId === recipient.id && !p.removedAt,
    )
    const index = saved ? waiting.findIndex((w) => w.clubPlayerId === saved.id) : -1
    return [
      {
        id: t.id,
        sessionId,
        pid: t.pid,
        senderName: sender.nameSnapshot,
        senderNickname: sender.nicknameSnapshot,
        recipientPlayerId: recipient.id,
        recipientName: recipient.fullName,
        recipientRtrId: recipient.rtrId,
        recipientWaitlistPosition: index >= 0 ? index + 1 : null,
        suggestedLevel: (index >= 0 ? waiting[index]?.level : null) ?? saved?.playingLevel ?? null,
        viaLink: !!t.linkTokenDigest,
        at: t.requestedAt,
      },
    ]
  })
}

/**
 * The sender's own pending transfer for My night (#1011), or null. A transfer link (#1012) shows
 * with no recipient until someone claims it.
 */
export function mySlotTransfer(
  state: Pick<MockState, 'slotTransfers' | 'players'>,
  sessionId: string,
  rosterId: string,
): MySlotTransfer | null {
  const t = pendingSlotTransfers(state, sessionId).find((x) => x.pid === rosterId)
  if (!t) return null
  const recipient = t.recipientPlayerId
    ? state.players.find((p) => p.id === t.recipientPlayerId)
    : null
  if (!recipient && !t.linkTokenDigest) return null
  return {
    id: t.id,
    recipientName: recipient?.fullName ?? null,
    recipientRtrId: recipient?.rtrId ?? null,
    viaLink: !!t.linkTokenDigest,
    at: t.requestedAt,
  }
}
