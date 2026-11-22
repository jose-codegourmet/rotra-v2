'use client'

import { useCancelMatchRequest } from '@rotra/data/match-request/useCancelMatchRequest'
import type { MyNight as MyNightData } from '@rotra/data/public-session/types'
import { useLeaveSession } from '@rotra/data/public-session/useLeaveSession'
import { useMoveMeToWaitlist } from '@rotra/data/public-session/useMoveMeToWaitlist'
import { useSelfCheckIn } from '@rotra/data/public-session/useSelfCheckIn'
import { useSendDropOutNotice } from '@rotra/data/public-session/useSendDropOutNotice'
import { transferLinkUrl } from '@rotra/data/slot-transfer/slotTransfer.rules'
import type { TransferRecipient } from '@rotra/data/slot-transfer/slotTransfer.types'
import { useCreateTransferLink } from '@rotra/data/slot-transfer/useCreateTransferLink'
import { useFindTransferRecipient } from '@rotra/data/slot-transfer/useFindTransferRecipient'
import { useRequestSlotTransfer } from '@rotra/data/slot-transfer/useRequestSlotTransfer'
import { useWithdrawSlotTransfer } from '@rotra/data/slot-transfer/useWithdrawSlotTransfer'
import { SlotTransferForm } from '@rotra/ui/forms/slot-transfer-form'
import { MyNightCard } from '@rotra/ui/my-night-card'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { toast } from '@rotra/ui/toaster'
import { TransferLinkSheet } from '@rotra/ui/transfer-link-sheet'
import { useState } from 'react'

export type MyNightProps = {
  slug: string
  night: MyNightData
  /** "Nov 9, 7:30 PM": the session's start, for "Confirmed · starts DATE, TIME" */
  startsLabel: string
  /** The session is prepared or live; once it finishes or is cancelled, open requests and notices are hidden (kept in state) */
  sessionOpen: boolean
  /** The club takes join requests online; Invite is hidden when it does not */
  acceptJoinRequests: boolean
  /** The visitor is offline (DevMenu): a check-in reads "Checked in · the QM will see it when their device syncs" */
  offline?: boolean
  /** Opens the Session invite sheet */
  onInvite: () => void
  /** Opens Request a match (Q17.14); the card shows the button for a present Player only */
  onRequestMatch?: () => void
}

/** Any of the Player's writes: the playerId in, a toast message out. */
type Writer = {
  mutate: (
    input: { playerId: string },
    options: { onSuccess: (done: { message: string }) => void; onError: (error: Error) => void },
  ) => void
}

/**
 * Q-PUBLIC-JOIN › My night: wires the personal projection (useMyNight) to MyNightCard and the
 * Player's own writes: I'm here, I'm leaving, I can't make it, Cancel on an open match request and
 * Move me to the waitlist (#735, hidden while the Player is on court, playing or queued), and
 * Transfer my slot (#1011: before the start, the sheet finds the recipient by RTR ID, then sends
 * the request; Withdraw request on a pending one; #1012: Create a transfer link for a recipient with
 * no ROTRA account, shown once in the Transfer link sheet, then Cancel link until someone claims it).
 * Each toast is the write's own message; offline, the check-in message carries the sync line.
 */
export function MyNight({
  slug,
  night,
  startsLabel,
  sessionOpen,
  acceptJoinRequests,
  offline = false,
  onInvite,
  onRequestMatch,
}: MyNightProps) {
  const checkIn = useSelfCheckIn(slug)
  const leave = useLeaveSession(slug)
  const dropOut = useSendDropOutNotice(slug)
  const cancelRequest = useCancelMatchRequest(slug)
  const stepDown = useMoveMeToWaitlist(slug)
  const find = useFindTransferRecipient(slug)
  const sendTransfer = useRequestSlotTransfer(slug)
  const withdrawTransfer = useWithdrawSlotTransfer(slug)
  const createLink = useCreateTransferLink(slug)
  const [transferOpen, setTransferOpen] = useState(false)
  // The new transfer link (#1012): its token is returned once, so the link lives only in this state.
  const [link, setLink] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<TransferRecipient | null>(null)
  // A fresh form each time the sheet opens, so an earlier RTR ID never lingers.
  const [transferKey, setTransferKey] = useState(0)
  if (night.status === 'none' || !night.stage) return null

  const pending =
    checkIn.isPending ||
    leave.isPending ||
    dropOut.isPending ||
    cancelRequest.isPending ||
    stepDown.isPending ||
    withdrawTransfer.isPending
  const run = (write: Writer) => () =>
    write.mutate(
      { playerId: night.playerId },
      {
        onSuccess: (done) => toast(done.message),
        onError: (error) => toast.error(error.message),
      },
    )
  const match = night.onCourt ?? night.inQueue
  const openTransfer = (open: boolean) => {
    setTransferOpen(open)
    if (open) setTransferKey((k) => k + 1)
    else {
      setRecipient(null)
      find.reset()
      sendTransfer.reset()
      createLink.reset()
    }
  }
  const copyLink = () => {
    if (!link) return
    const unavailable = () => toast('Select the link and copy it')
    try {
      navigator.clipboard.writeText(link).then(() => toast('Transfer link copied'), unavailable)
    } catch {
      unavailable()
    }
  }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const transfer = sessionOpen ? night.slotTransfer : null

  return (
    <>
      <MyNightCard
        stage={night.stage}
        waitlistPosition={night.waitlistPosition ?? undefined}
        startsLabel={startsLabel}
        cantMakeItSent={sessionOpen && night.cantMakeItSent}
        hasLeft={night.hasLeft}
        checkedIn={night.checkedIn}
        offline={night.offline || offline}
        games={night.games}
        won={night.won}
        lost={night.lost}
        minimum={night.minimum}
        queuePosition={night.inQueue?.position}
        matchLabel={match?.matchLabel}
        courtLabel={night.onCourt?.courtLabel}
        matchRequestOpen={sessionOpen && night.matchRequest !== null}
        canInvite={sessionOpen && acceptJoinRequests && night.canInvite}
        pending={pending}
        onCheckIn={run(checkIn)}
        onLeave={run(leave)}
        onCantMakeIt={run(dropOut)}
        onCancelMatchRequest={run(cancelRequest)}
        onRequestMatch={sessionOpen ? onRequestMatch : undefined}
        onInvite={onInvite}
        onStepDown={sessionOpen ? run(stepDown) : undefined}
        inMatch={night.onCourt !== null || night.inQueue !== null}
        transferPendingTo={transfer?.recipientName ?? undefined}
        transferLinkOpen={!!transfer?.viaLink && !transfer.recipientName}
        onTransfer={sessionOpen && night.canTransfer ? () => openTransfer(true) : undefined}
        onWithdrawTransfer={run(withdrawTransfer)}
      />
      <SlotTransferForm
        key={transferKey}
        open={transferOpen}
        onOpenChange={openTransfer}
        startsLabel={startsLabel}
        isFinding={find.isPending}
        findError={find.error?.message}
        recipient={
          recipient && {
            name: recipient.fullName,
            rtrId: recipient.rtrId,
            photoUrl: profilePictureSrc(recipient.picture, recipient.playerId, recipient.fullName),
            waitlistPosition: recipient.waitlistPosition,
          }
        }
        onRtrIdChange={() => {
          setRecipient(null)
          find.reset()
        }}
        onFind={({ rtrId }) =>
          find.mutate(
            { playerId: night.playerId, rtrId },
            { onSuccess: (found) => setRecipient(found) },
          )
        }
        isPending={sendTransfer.isPending}
        serverError={sendTransfer.error?.message ?? createLink.error?.message}
        isCreatingLink={createLink.isPending}
        onCreateLink={() =>
          createLink.mutate(
            { playerId: night.playerId },
            {
              onSuccess: (done) => {
                toast(done.message)
                openTransfer(false)
                setLink(transferLinkUrl(location.origin, slug, done.data.token))
              },
            },
          )
        }
        onSubmit={({ rtrId }) =>
          sendTransfer.mutate(
            { playerId: night.playerId, rtrId },
            {
              onSuccess: (done) => {
                toast(done.message)
                openTransfer(false)
              },
            },
          )
        }
      />
      {link ? (
        <TransferLinkSheet
          open
          onOpenChange={(open) => {
            if (!open) setLink(null)
          }}
          link={link}
          startsLabel={startsLabel}
          onCopy={copyLink}
          onShare={
            canShare
              ? () =>
                  void navigator
                    .share({ title: 'Take my slot on ROTRA', url: link })
                    .catch(() => undefined)
              : undefined
          }
        />
      ) : null}
    </>
  )
}
