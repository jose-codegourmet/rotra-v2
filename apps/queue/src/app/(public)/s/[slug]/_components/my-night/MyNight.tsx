'use client'

import { useCancelMatchRequest } from '@rotra/data/match-request/useCancelMatchRequest'
import type { MyNight as MyNightData } from '@rotra/data/public-session/types'
import { useLeaveSession } from '@rotra/data/public-session/useLeaveSession'
import { useMoveMeToWaitlist } from '@rotra/data/public-session/useMoveMeToWaitlist'
import { useSelfCheckIn } from '@rotra/data/public-session/useSelfCheckIn'
import { useSendDropOutNotice } from '@rotra/data/public-session/useSendDropOutNotice'
import { MyNightCard } from '@rotra/ui/my-night-card'
import { toast } from '@rotra/ui/toaster'

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
 * Move me to the waitlist (#735, hidden while the Player is on court, playing or queued).
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
  if (night.status === 'none' || !night.stage) return null

  const pending =
    checkIn.isPending ||
    leave.isPending ||
    dropOut.isPending ||
    cancelRequest.isPending ||
    stepDown.isPending
  const run = (write: Writer) => () =>
    write.mutate(
      { playerId: night.playerId },
      {
        onSuccess: (done) => toast(done.message),
        onError: (error) => toast.error(error.message),
      },
    )
  const match = night.onCourt ?? night.inQueue

  return (
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
    />
  )
}
