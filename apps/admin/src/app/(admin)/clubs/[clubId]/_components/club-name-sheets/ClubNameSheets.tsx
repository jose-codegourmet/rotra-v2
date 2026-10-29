'use client'

import type { AdminClubDetail } from '@rotra/data/club/types'
import { useApproveClubNameChange } from '@rotra/data/club/useApproveClubNameChange'
import { useRejectClubNameChange } from '@rotra/data/club/useRejectClubNameChange'
import { ChangeCompare } from '@rotra/ui/change-compare'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef } from 'react'

export type ClubNameDecision = 'approve' | 'reject'

export type ClubNameSheetsProps = {
  club: AdminClubDetail
  /** Which confirmation is open; null when neither */
  decision: ClubNameDecision | null
  onClose: () => void
}

/**
 * D-CLUB-NAME: Approve name change? and Reject name change? over useApproveClubNameChange /
 * useRejectClubNameChange. The names shown are kept while a sheet closes, since a decided request
 * leaves the club detail as soon as it is saved.
 */
export function ClubNameSheets({ club, decision, onClose }: ClubNameSheetsProps) {
  const approve = useApproveClubNameChange()
  const reject = useRejectClubNameChange()
  const { reset: resetApprove } = approve
  const { reset: resetReject } = reject
  const pending = approve.isPending || reject.isPending

  const shown = useRef({ name: club.name, requestedName: '' })
  if (club.pendingNameRequest) {
    shown.current = { name: club.name, requestedName: club.pendingNameRequest.requestedName }
  }
  const { name, requestedName } = shown.current

  useEffect(() => {
    if (decision) {
      resetApprove()
      resetReject()
    }
  }, [decision, resetApprove, resetReject])

  const close = (open: boolean) => {
    if (!open && !pending) onClose()
  }

  const doApprove = () =>
    approve.mutate(club.id, {
      onSuccess: ({ changed, name: next }) => {
        onClose()
        if (changed) toast(`Name changed to ${next}.`)
      },
      onError: (error) => toast.error(error.message),
    })

  const doReject = () =>
    reject.mutate(club.id, {
      onSuccess: ({ changed, name: kept }) => {
        onClose()
        if (changed) toast(`Rejected. The club keeps ${kept}.`)
      },
      onError: (error) => toast.error(error.message),
    })

  return (
    <>
      <ConfirmSheet
        open={decision === 'approve'}
        onOpenChange={close}
        title="Approve name change?"
        summary={<ChangeCompare from={name} to={requestedName} toLabel="New" />}
        consequence="The new name shows on the club's dashboard, its public session pages and future result images."
        note="RTR IDs and the founding address don't change."
        confirmLabel={approve.isPending ? 'Approving…' : 'Approve name change'}
        onConfirm={doApprove}
        isPending={approve.isPending}
        error={approve.error?.message}
      />
      <ConfirmSheet
        open={decision === 'reject'}
        onOpenChange={close}
        title="Reject name change?"
        consequence={`${name} keeps its current name, and the request for “${requestedName}” is closed. The club can send a new request.`}
        confirmLabel={reject.isPending ? 'Rejecting…' : 'Reject request'}
        onConfirm={doReject}
        isPending={reject.isPending}
        error={reject.error?.message}
        destructive
      />
    </>
  )
}
