'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { matchRequestFormatLabel } from '@rotra/data/match/matchRequestDecisions'
import { useAddMatchRequestToQueue } from '@rotra/data/match/useAddMatchRequestToQueue'
import { useDeclineMatchRequest } from '@rotra/data/match/useDeclineMatchRequest'
import type { MatchRequestSpot as RequestSpot } from '@rotra/data/match-request/types'
import { useSessionRequests } from '@rotra/data/match-request/useSessionRequests'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { isRealDataMode } from '@rotra/data/real/mode'
import { firstEligibleWaiter } from '@rotra/data/session-payment/refund-rules'
import { useConfirmRequest } from '@rotra/data/session-roster/useConfirmRequest'
import { useDeclineJoinRequest } from '@rotra/data/session-roster/useDeclineJoinRequest'
import { useJoinRequestHints } from '@rotra/data/session-roster/useJoinRequestHints'
import { useKeepDropOut } from '@rotra/data/session-roster/useKeepDropOut'
import { useRemoveDropOut } from '@rotra/data/session-roster/useRemoveDropOut'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useApproveSlotTransfer } from '@rotra/data/slot-transfer/useApproveSlotTransfer'
import { useRejectAndRefundSlotTransfer } from '@rotra/data/slot-transfer/useRejectAndRefundSlotTransfer'
import { useRejectSlotTransfer } from '@rotra/data/slot-transfer/useRejectSlotTransfer'
import { type JoinRequestDetails, JoinRequestsPanel } from '@rotra/ui/join-requests-panel'
import { levelLabel } from '@rotra/ui/level-pill'
import type { MatchRequestSpot } from '@rotra/ui/match-request-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { RefundConfirmSheet } from '@rotra/ui/refund-confirm-sheet'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

export type JoinRequestsProps = {
  sessionId: string
  /**
   * `card` (Preparation, between the header and the tabs) renders nothing while nothing waits;
   * `sheet` (the live console's Requests sheet behind Match requests · N) always renders the panel body.
   */
  variant?: 'card' | 'sheet'
  className?: string
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** “· On Court 2” / “· In queue #1” on a named spot, or nothing. */
function whereLabel(where: RequestSpot['where']) {
  if (!where) return undefined
  return where.kind === 'court' ? `On ${where.courtLabels}` : `In queue #${where.position}`
}

/**
 * Requests from the session page (Q18.12): JoinRequestsPanel without tabs. Before Start it lists
 * drop-out notices, pending slot transfers (#1011: Approve with a level, Reject), then join
 * requests (#1014: Reject and refund opens RefundConfirmSheet with the slot's whole cash, then the
 * sender's registration is cancelled and the first eligible waitlisted player is promoted); once
 * live, match requests only (join requests close at
 * Start). Join requests come from useSessionRoster; the ROTRA-player
 * hints, drop-out notices and match requests from useSessionRequests, and the shared rank from
 * useJoinRequestHints. Every decision toasts its result or its error; a refused decision leaves
 * the request waiting.
 */
export function JoinRequests({ sessionId, variant = 'card', className }: JoinRequestsProps) {
  const submitting = useRef(false)
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const requests = useSessionRequests(sessionId)
  const hints = useJoinRequestHints(sessionId)
  const clubPlayers = useClubPlayers()
  const confirm = useConfirmRequest()
  const decline = useDeclineJoinRequest()
  const keep = useKeepDropOut()
  const remove = useRemoveDropOut()
  const approveTransfer = useApproveSlotTransfer()
  const rejectTransfer = useRejectSlotTransfer()
  const rejectAndRefund = useRejectAndRefundSlotTransfer()
  // #1014: the transfer whose Reject and refund confirmation is open
  const [refundId, setRefundId] = useState<string | null>(null)
  const addMatch = useAddMatchRequestToQueue()
  const declineMatch = useDeclineMatchRequest()

  const run = <T,>(mutate: (input: T, options: object) => void, input: T, quiet = false) => {
    if (submitting.current) return
    submitting.current = true
    mutate(input, {
      onSettled: () => {
        submitting.current = false
      },
      onSuccess: (result: { message: string }) => {
        if (!quiet) toast(result.message)
      },
      onError: (error: unknown) => toast.error(errorMessage(error)),
    })
  }

  const s = session.data
  const joinRequests = roster.data?.joinRequests ?? []
  const pending = joinRequests.filter((r) => r.status === 'pending').length
  const view = requests.data
  const dropOuts = view?.dropOuts ?? []
  const transfers = view?.transfers ?? []
  const matchRequests = view?.match ?? []
  // No tabs: before Start the panel lists join requests and drop-out notices; live, match requests only.
  const live = s?.state === 'active'
  const waiting = live ? matchRequests.length : pending + dropOuts.length + transfers.length
  // The card only appears once something is waiting, so it stays hidden while loading; the sheet
  // always has a body and shows Skeleton rows until the roster arrives.
  const real = isRealDataMode()
  const loading = session.isPending || roster.isPending || (!real && requests.isPending)
  if (variant === 'card' && (loading || waiting === 0)) return null

  const capacity = s ? slotCapacity(s.courts.length, s.playersPerCourt) : 0
  const slotsFull = (roster.data?.roster.length ?? 0) >= capacity
  // Real mode's Requests read carries match requests only; its refusal must not hide the join
  // requests, which come from the roster read there.
  const requestsError = real ? null : requests.error

  // D-2026-11-11-02: a Join from waitlist request names the player's current place.
  const waitlistOrder = (roster.data?.waitlist ?? []).slice().sort((a, b) => a.addedAt - b.addedAt)
  const waitlistPositionOf = (clubPlayerId: string | null | undefined) => {
    const index = clubPlayerId
      ? waitlistOrder.findIndex((w) => w.clubPlayerId === clubPlayerId)
      : -1
    return index < 0 ? null : index + 1
  }
  const requestDetails: Record<string, JoinRequestDetails> = {}
  for (const r of joinRequests)
    if (r.placement === 'from_waitlist')
      requestDetails[r.id] = { waitlistPosition: waitlistPositionOf(r.clubPlayerId) }
  for (const r of view?.join ?? []) {
    const hint = hints.data?.[r.id]
    requestDetails[r.id] = {
      ...requestDetails[r.id],
      account: r.account ? (r.account.inClub ? 'in-club' : 'new-to-club') : undefined,
      sharedRank: hint?.sharedRank ? levelLabel(hint.sharedRank) : null,
      invitedBy: r.invitedByName ?? undefined,
    }
  }

  // Real mode's Requests read has no join requests: a signed-in Player's request carries their
  // account on the roster read (#687), and Saved players says whether they're already in the club (#694).
  if (real)
    for (const r of joinRequests)
      if (r.playerId && !requestDetails[r.id]?.account)
        requestDetails[r.id] = {
          ...requestDetails[r.id],
          account: clubPlayers.data?.players.some((p) => p.playerId === r.playerId)
            ? 'in-club'
            : 'new-to-club',
        }

  // The prototype's avatar(): the saved player's picture on drop-out rows and named match spots.
  const photoFor = (rosterId: string) => {
    const row = roster.data?.roster.find((r) => r.id === rosterId)
    const p = row && clubPlayers.data?.players.find((item) => item.id === row.clubPlayerId)
    return p
      ? profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName)
      : undefined
  }

  const minimum = view?.minimum ?? 0
  const spotOf = (role: MatchRequestSpot['role'], spot: RequestSpot | null): MatchRequestSpot => ({
    role,
    player: spot
      ? {
          name: spot.name,
          photoUrl: photoFor(spot.rosterId),
          games: spot.games,
          minimumGames: minimum,
          level: spot.level,
          where: whereLabel(spot.where),
        }
      : null,
  })

  const isPending =
    confirm.isPending ||
    decline.isPending ||
    keep.isPending ||
    remove.isPending ||
    approveTransfer.isPending ||
    rejectTransfer.isPending ||
    rejectAndRefund.isPending ||
    addMatch.isPending ||
    declineMatch.isPending

  // #1014: the open Reject and refund confirmation. The refund is the slot's whole cash (the Requests
  // read's payment snapshot); the preview names who the freed slot goes to (FIFO, a level needed).
  const refundTransfer = refundId ? transfers.find((t) => t.id === refundId) : undefined
  const rosterCount = roster.data?.roster.length ?? 0
  const nextWaiter = firstEligibleWaiter(
    waitlistOrder,
    capacity - (rosterCount - 1),
    (w) => !!w.level,
  )
  const nextWaiterName = nextWaiter
    ? (clubPlayers.data?.players.find((p) => p.id === nextWaiter.clubPlayerId)?.displayName ?? null)
    : null
  const closeRefund = () => {
    if (!rejectAndRefund.isPending) setRefundId(null)
  }
  const confirmRefund = () => {
    if (!refundTransfer?.payment || submitting.current) return
    submitting.current = true
    rejectAndRefund.mutate(
      {
        sessionId,
        transferId: refundTransfer.id,
        expectedRefundMinor: refundTransfer.payment.paidMinor,
      },
      {
        onSettled: () => {
          submitting.current = false
        },
        onSuccess: (result) => {
          setRefundId(null)
          toast(result.message)
        },
      },
    )
  }

  return (
    <>
      {refundTransfer?.payment ? (
        <RefundConfirmSheet
          open
          onOpenChange={(open) => {
            if (!open) closeRefund()
          }}
          variant="transfer"
          name={refundTransfer.senderName}
          recipientName={refundTransfer.recipientName}
          amountMinor={refundTransfer.payment.paidMinor}
          waivedMinor={refundTransfer.payment.priorWaivedMinor}
          nextWaiterName={nextWaiterName}
          onConfirm={confirmRefund}
          isPending={rejectAndRefund.isPending}
          error={rejectAndRefund.error ? errorMessage(rejectAndRefund.error) : undefined}
        />
      ) : null}
      <JoinRequestsPanel
        loading={loading}
        isPending={isPending}
        serverError={
          confirm.error || decline.error || session.error || roster.error || requestsError
            ? errorMessage(
                confirm.error ?? decline.error ?? session.error ?? roster.error ?? requestsError,
              )
            : undefined
        }
        requests={joinRequests}
        requestDetails={requestDetails}
        dropOuts={dropOuts.map((d) => ({
          id: d.id,
          name: d.name,
          photoUrl: photoFor(d.pid),
          timeLabel: formatTime(d.at),
          isPending,
          onRemove: () => run(remove.mutate, { sessionId, noticeId: d.id }),
          onKeep: () => run(keep.mutate, { sessionId, noticeId: d.id }),
        }))}
        transfers={transfers.map((t) => ({
          id: t.id,
          senderName: t.senderName,
          senderPhotoUrl: photoFor(t.pid),
          recipientName: t.recipientName,
          recipientRtrId: t.recipientRtrId,
          recipientWaitlistPosition: t.recipientWaitlistPosition,
          suggestedLevel: t.suggestedLevel,
          viaLink: t.viaLink ?? false,
          // #1013: the waiver Approve records, shown first; Approve sends it back as the one seen.
          payment: t.payment,
          timeLabel: formatTime(t.at),
          isPending,
          onApprove: (level) =>
            run(approveTransfer.mutate, {
              sessionId,
              transferId: t.id,
              level,
              expectedWaiverMinor: t.payment?.waivedMinor,
            }),
          onReject: () => run(rejectTransfer.mutate, { sessionId, transferId: t.id }),
          onRejectAndRefund: () => {
            rejectAndRefund.reset()
            setRefundId(t.id)
          },
        }))}
        matchRequests={matchRequests.map((m) => ({
          id: m.id,
          requesterName: m.requester.name,
          formatLabel: matchRequestFormatLabel(m.format),
          requestedLabel: formatTime(m.at),
          spots: [
            spotOf('Requester', m.requester),
            ...m.partners.map((p) => spotOf('Partner', p)),
            ...m.opponents.map((p) => spotOf('Opponent', p)),
          ],
          isPending,
          onAddToQueue: () => run(addMatch.mutate, { sessionId, requestId: m.id }),
          onDecline: () => run(declineMatch.mutate, { sessionId, requestId: m.id }),
        }))}
        live={live}
        slotsFull={slotsFull}
        variant={variant}
        className={className}
        onConfirm={(requestId, level) => run(confirm.mutate, { requestId, level })}
        onDecline={(requestId) => run(decline.mutate, requestId)}
      />
    </>
  )
}
