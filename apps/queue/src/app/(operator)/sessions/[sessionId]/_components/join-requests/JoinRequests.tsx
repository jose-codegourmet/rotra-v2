'use client'

import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useConfirmJoinRequest } from '@rotra/data/session-roster/useConfirmJoinRequest'
import { useDeclineJoinRequest } from '@rotra/data/session-roster/useDeclineJoinRequest'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { JoinRequestsPanel } from '@rotra/ui/join-requests-panel'
import { toast } from '@rotra/ui/toaster'

export type JoinRequestsProps = {
  sessionId: string
  /**
   * `card` (Preparation, between the header and the tabs) renders nothing while no request is
   * pending; `sheet` (the live console's "Join requests · N" sheet) always renders the panel body.
   */
  variant?: 'card' | 'sheet'
  className?: string
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Join requests from the session link: JoinRequestsPanel on useSessionRoster, confirming (with the
 * level the Queue Master chose) through useConfirmJoinRequest and declining through
 * useDeclineJoinRequest. Confirmed guests go to the roster, or to the waitlist once slots are full.
 */
export function JoinRequests({ sessionId, variant = 'card', className }: JoinRequestsProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const confirm = useConfirmJoinRequest()
  const decline = useDeclineJoinRequest()

  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) => toast.error(errorMessage(error)),
  }

  const s = session.data
  const requests = roster.data?.joinRequests ?? []
  const pending = requests.filter((r) => r.status === 'pending').length
  if (!s || !roster.data) return null
  if (variant === 'card' && pending === 0) return null

  const capacity = slotCapacity(s.courts.length, s.playersPerCourt)
  const slotsFull = roster.data.roster.length >= capacity

  return (
    <JoinRequestsPanel
      requests={requests}
      slotsFull={slotsFull}
      variant={variant}
      className={className}
      onConfirm={(requestId, level) => confirm.mutate({ requestId, level }, options)}
      onDecline={(requestId) => decline.mutate(requestId, options)}
    />
  )
}
