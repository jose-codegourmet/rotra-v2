'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { CONTACT_FIELD_WORD } from '@rotra/data/contact-change-request/rules'
import type { AdminContactRequestDetail } from '@rotra/data/contact-change-request/types'
import { useApproveContactChange } from '@rotra/data/contact-change-request/useApproveContactChange'
import { useDeclineContactChange } from '@rotra/data/contact-change-request/useDeclineContactChange'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef, useState } from 'react'

export type ContactDecision = 'approve' | 'decline'

export type ContactDecisionSheetsProps = {
  request: AdminContactRequestDetail
  /** The player's nickname, else the first word of the name (prototype firstName) */
  firstName: string
  /** Which confirmation is open; null when neither */
  decision: ContactDecision | null
  onClose: () => void
}

/**
 * D-CONTACT (Approve change) and Decline this request? over useApproveContactChange /
 * useDeclineContactChange. Approving only starts the application: the toast says it is being
 * applied, and the review page reports Applied or Not applied when the application settles, never
 * a "Contact changed" on save. Offline, the confirm button sends nothing and the sheet says so; while
 * a decision is saving the sheet can't be closed and one tap sends one request.
 */
export function ContactDecisionSheets({
  request,
  firstName,
  decision,
  onClose,
}: ContactDecisionSheetsProps) {
  const approve = useApproveContactChange()
  const decline = useDeclineContactChange()
  const { offline } = useAdminConnectivity()
  // Each refused tap counts, so the sheet re-renders and its one-commit guard lets the next tap through.
  const [offlineTaps, setOfflineTaps] = useState(0)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  const { reset: resetApprove } = approve
  const { reset: resetDecline } = decline
  const pending = approve.isPending || decline.isPending

  useEffect(() => {
    if (decision) {
      setOfflineTaps(0)
      resetApprove()
      resetDecline()
    }
  }, [decision, resetApprove, resetDecline])

  const close = (open: boolean) => {
    if (!open && !pending) onClose()
  }

  // rotra-admin.html offlineBlock: nothing is sent; the sheet stays open with the reason.
  const blockedOffline = () => {
    if (!offline) {
      setOfflineTaps(0)
      return false
    }
    approve.reset()
    decline.reset()
    setOfflineTaps((taps) => taps + 1)
    return true
  }
  // A new node on every render: ConfirmSheet re-arms its confirm when `error` changes.
  const offlineError = offlineTaps ? <>{ADMIN_OFFLINE_ERROR}</> : null

  const field = CONTACT_FIELD_WORD[request.field]
  const from = request.fromValue || 'Not set'

  const doApprove = () => {
    if (sending.current || blockedOffline()) return
    sending.current = true
    approve.mutate(request.requestId, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: () => {
        onClose()
        toast('Approved. Applying the change…')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const doDecline = () => {
    if (sending.current || blockedOffline()) return
    sending.current = true
    decline.mutate(request.requestId, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: () => {
        onClose()
        toast(`Declined. ${firstName} keeps the current ${field}.`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <>
      <ConfirmSheet
        open={decision === 'approve'}
        onOpenChange={close}
        title={`Approve ${field} change?`}
        summary={
          <KeyValueList
            items={[
              { label: 'Player', value: <b>{request.player.fullName}</b> },
              {
                label: 'RTR ID',
                value: <span className="font-mono">{request.player.rtrId}</span>,
              },
              { label: 'From', value: <span className="font-mono">{from}</span> },
              { label: 'To', value: <span className="font-mono">{request.toValue}</span> },
            ]}
          />
        }
        consequence={`After you approve, ROTRA applies the change to the account. ${firstName} signs in with the new ${field} once it shows as Applied.`}
        note="The RTR ID and match history stay the same. This isn't a correction to any game result."
        backLabel="Return to request"
        confirmLabel={approve.isPending ? 'Approving…' : 'Approve change'}
        onConfirm={doApprove}
        isPending={approve.isPending}
        error={offlineError ?? approve.error?.message}
      />
      <ConfirmSheet
        open={decision === 'decline'}
        onOpenChange={close}
        title="Decline this request?"
        consequence={
          <>
            {request.player.fullName} keeps <span className="font-mono">{from}</span> as their{' '}
            {field}. They see the request as not approved and can send a new one.
          </>
        }
        note="How players are told, and whether you can ask them for more details first, hasn't been decided."
        confirmLabel={decline.isPending ? 'Declining…' : 'Decline request'}
        onConfirm={doDecline}
        isPending={decline.isPending}
        error={offlineError ?? decline.error?.message}
        destructive
      />
    </>
  )
}
