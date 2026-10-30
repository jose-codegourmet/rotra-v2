'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { CONTACT_CHECK_OFFLINE_ERROR } from '@rotra/data/contact-change-request/fetchers'
import { CONTACT_FIELD_WORD } from '@rotra/data/contact-change-request/rules'
import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import { useCheckContactApplication } from '@rotra/data/contact-change-request/useCheckContactApplication'
import { useContactRequest } from '@rotra/data/contact-change-request/useContactRequest'
import { useRetryContactApplication } from '@rotra/data/contact-change-request/useRetryContactApplication'
import { ApprovalScopeCard } from '@rotra/ui/approval-scope-card'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { ContactChecksList } from '@rotra/ui/contact-checks-list'
import { REQUEST_FIELD_LABEL } from '@rotra/ui/contact-request-status/variants'
import { ContactRequestStatusChip } from '@rotra/ui/contact-request-status-chip'
import { ContactRequestStatusNotice } from '@rotra/ui/contact-request-status-notice'
import { ContactVerificationNote } from '@rotra/ui/contact-verification-note'
import { CurrentContactsCard } from '@rotra/ui/current-contacts-card'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { RequestedChangeCard } from '@rotra/ui/requested-change-card'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useDenyOnPermissionError } from '../../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import {
  type ContactDecision,
  ContactDecisionSheets,
} from '../contact-decision-sheets/ContactDecisionSheets'
import { ContactReviewSkeleton } from './ContactReviewSkeleton'

const isApplying = (status: ContactChangeStatus | undefined) =>
  status === 'applying' || status === 'approved'

/**
 * A-CONTACT-REVIEW: one contact-change request against its permanent player ID. The requested
 * change, and while it waits for review the checks and the verification placeholder, beside the
 * contacts in use right now and what approval changes. Pending: Back without deciding, Decline,
 * Approve (off while any check fails). Applying: Check status. Needs attention: Retry application
 * (the same approved request). Applied / Not approved are toasted only when the application
 * actually settles, never because the approval was saved. `from` is the list's query, so Back
 * restores its status filter. Skeleton while the request loads, Request not found (not-found.tsx)
 * for an unknown id, Retry when the load fails; a permission error denies the workspace. Offline the
 * page stays readable under the workspace's offline band, and every action refuses without sending.
 */
export function ContactReview({ requestId, from }: { requestId: string; from: string }) {
  const router = useRouter()
  const requestQuery = useContactRequest(requestId)
  const check = useCheckContactApplication()
  const retry = useRetryContactApplication()
  const { offline } = useAdminConnectivity()
  const denied = useDenyOnPermissionError(requestQuery.error)
  const [decision, setDecision] = useState<ContactDecision | null>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  const request = requestQuery.data
  const status = request?.status

  const player = request?.player
  const firstName = player
    ? player.nickname || player.fullName.split(' ')[0] || player.fullName
    : ''

  // rotra-admin.html runApply: tell the outcome once the application settles (the detail polls
  // while it applies), whether it settled on its own or through Check status.
  const previous = useRef(status)
  useEffect(() => {
    const was = previous.current
    previous.current = status
    if (!request || !isApplying(was)) return
    if (status === 'applied') toast(`Applied. ${firstName} now signs in with ${request.toValue}.`)
    else if (status === 'failed')
      toast(
        `Not applied. ${firstName} still signs in with the old ${CONTACT_FIELD_WORD[request.field]}.`,
      )
  }, [status, request, firstName])

  const listHref = from ? `/requests/contact-changes?${from}` : '/requests/contact-changes'
  const back = <Breadcrumb label="Contact changes" href={listHref} linkAs={Link} />
  if (denied) return null
  if (request === null) notFound()
  if (!request || !player) {
    return (
      <>
        {back}
        {requestQuery.isError ? (
          <ErrorState
            title="Couldn't load this request."
            onRetry={() => void requestQuery.refetch()}
            retrying={requestQuery.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        ) : (
          <ContactReviewSkeleton />
        )}
      </>
    )
  }

  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : ''

  const checkStatus = () => {
    if (check.isPending || sending.current) return
    if (offline) {
      toast(CONTACT_CHECK_OFFLINE_ERROR)
      return
    }
    sending.current = true
    check.mutate(request.requestId, {
      onSettled: () => {
        sending.current = false
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const retryApplication = () => {
    if (retry.isPending || sending.current) return
    if (offline) {
      toast(ADMIN_OFFLINE_ERROR)
      return
    }
    sending.current = true
    retry.mutate(request.requestId, {
      onSettled: () => {
        sending.current = false
      },
      onError: (error) => toast.error(error.message),
    })
  }

  let actions: ReactNode = null
  if (request.status === 'pending') {
    actions = (
      <>
        <Button asChild>
          <Link href={listHref}>Back without deciding</Link>
        </Button>
        <Button variant="danger" onClick={() => setDecision('decline')}>
          Decline
        </Button>
        <Button
          variant="primary"
          disabled={request.blocked}
          onClick={() => {
            if (!request.blocked) setDecision('approve')
          }}
        >
          Approve
        </Button>
      </>
    )
  } else if (isApplying(request.status)) {
    actions = (
      <Button disabled={check.isPending} onClick={checkStatus}>
        {check.isPending ? 'Checking…' : 'Check status'}
      </Button>
    )
  } else if (request.status === 'failed') {
    actions = (
      <Button variant="primary" disabled={retry.isPending} onClick={retryApplication}>
        Retry application
      </Button>
    )
  }

  return (
    <>
      {back}
      <PageHeader
        eyebrow={<ContactRequestStatusChip status={request.status} conflict={request.blocked} />}
        title={`${REQUEST_FIELD_LABEL[request.field]} change for ${player.fullName}`}
      />
      <ContactRequestStatusNotice
        status={request.status}
        firstName={firstName}
        from={request.fromValue}
        to={request.toValue}
        approvedAt={request.approvedAt}
        appliedAt={request.appliedAt}
        decidedAt={request.decidedAt}
        error={request.error}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <RequestedChangeCard
            from={request.fromValue}
            to={request.toValue}
            requestedAt={request.requestedAt}
            source={request.source}
            firstName={firstName}
          />
          {request.status === 'pending' && request.checks ? (
            <>
              <ContactChecksList
                field={request.field}
                checks={request.checks}
                onOpenPlayer={(playerId) => router.push(`/players/${playerId}`)}
                onOpenRequest={(otherId) =>
                  router.push(`/requests/contact-changes/${otherId}${fromQuery}`)
                }
              />
              <ContactVerificationNote />
            </>
          ) : null}
          {actions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <CurrentContactsCard
            fullName={player.fullName}
            rtrId={player.rtrId}
            href={`/players/${player.id}`}
            linkComponent={Link}
            claimed={player.claimed}
            phone={player.phone}
            email={player.email}
          />
          <ApprovalScopeCard field={request.field} firstName={firstName} />
        </div>
      </div>
      <ContactDecisionSheets
        request={request}
        firstName={firstName}
        decision={decision}
        onClose={() => setDecision(null)}
      />
    </>
  )
}
