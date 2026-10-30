'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { AdminClubDetail } from '@rotra/data/club/types'
import { useApproveClubNameChange } from '@rotra/data/club/useApproveClubNameChange'
import { useRejectClubNameChange } from '@rotra/data/club/useRejectClubNameChange'
import { ChangeCompare } from '@rotra/ui/change-compare'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef, useState } from 'react'

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
 * leaves the club detail as soon as it is saved. Offline, the confirm button saves nothing and the
 * sheet says so; while a decision is saving the sheet can't be closed and one tap sends one request.
 */
export function ClubNameSheets({ club, decision, onClose }: ClubNameSheetsProps) {
  const approve = useApproveClubNameChange()
  const reject = useRejectClubNameChange()
  const { offline } = useAdminConnectivity()
  // Each refused tap counts, so the sheet re-renders and its one-commit guard lets the next tap through.
  const [offlineTaps, setOfflineTaps] = useState(0)
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
      setOfflineTaps(0)
      resetApprove()
      resetReject()
    }
  }, [decision, resetApprove, resetReject])

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
    reject.reset()
    setOfflineTaps((taps) => taps + 1)
    return true
  }
  // A new node on every render: ConfirmSheet re-arms its confirm when `error` changes.
  const offlineError = offlineTaps ? <>{ADMIN_OFFLINE_ERROR}</> : null

  const doApprove = () => {
    if (blockedOffline()) return
    approve.mutate(club.id, {
      onSuccess: ({ changed, name: next }) => {
        onClose()
        if (changed) toast(`Name changed to ${next}.`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const doReject = () => {
    if (blockedOffline()) return
    reject.mutate(club.id, {
      onSuccess: ({ changed, name: kept }) => {
        onClose()
        if (changed) toast(`Rejected. The club keeps ${kept}.`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

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
        error={offlineError ?? approve.error?.message}
      />
      <ConfirmSheet
        open={decision === 'reject'}
        onOpenChange={close}
        title="Reject name change?"
        consequence={`${name} keeps its current name, and the request for “${requestedName}” is closed. The club can send a new request.`}
        confirmLabel={reject.isPending ? 'Rejecting…' : 'Reject request'}
        onConfirm={doReject}
        isPending={reject.isPending}
        error={offlineError ?? reject.error?.message}
        destructive
      />
    </>
  )
}
