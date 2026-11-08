'use client'

import type {
  PasswordResetRequest,
  PasswordResetRequestList,
} from '@rotra/data/password-reset/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

export type PasswordResetRequestsProps = {
  data?: PasswordResetRequestList
  loading?: boolean
  error?: string
  actionError?: string
  pendingId?: string
  link?: { requestId: string; url: string }
  onRetry: () => void
  onPage: (page: number) => void
  onReview: (id: string, action: 'issue' | 'decline', ownershipVerified: boolean) => void
  onCopy: (url: string) => void
}

function RequestCard({
  request,
  pending,
  link,
  onReview,
  onCopy,
}: {
  request: PasswordResetRequest
  pending: boolean
  link?: string
  onReview: PasswordResetRequestsProps['onReview']
  onCopy: PasswordResetRequestsProps['onCopy']
}) {
  const [verified, setVerified] = useState(false)
  return (
    <Card asChild>
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label={`Password reset for ${request.email}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="break-words">{request.playerName ?? 'No eligible player account'}</h2>
            <p className="m-0 break-words text-[13px] text-fg2">{request.email}</p>
            {request.rtrId ? (
              <p className="m-0 font-mono text-xs text-fg2">{request.rtrId}</p>
            ) : null}
          </div>
          <span className="text-[13px] font-semibold">
            {request.status === 'pending'
              ? 'Pending review'
              : request.status === 'issued'
                ? 'Link issued'
                : 'Declined'}
          </span>
        </div>
        <p className="m-0 text-xs text-fg2">
          Requested {new Date(request.requestedAt).toLocaleString()}
        </p>
        {request.reviewedAt ? (
          <p className="m-0 text-xs text-fg2">
            Reviewed by {request.reviewedBy} · {new Date(request.reviewedAt).toLocaleString()}
          </p>
        ) : null}
        {request.status !== 'declined' ? (
          <>
            {!request.canIssue ? (
              <Notice tone="warn">
                No eligible account matches this request. Ask the player to submit their current
                account email.
              </Notice>
            ) : (
              <Checkbox
                label="I have verified this player owns this account."
                description="A matching email and this request alone do not prove ownership."
                checked={verified}
                onChange={setVerified}
                disabled={pending}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {request.playerId ? (
                <Button asChild size="sm">
                  <a href={`/players/${request.playerId}`}>View player</a>
                </Button>
              ) : null}
              <Button
                variant="primary"
                disabled={pending || !verified || !request.canIssue}
                onClick={() => {
                  setVerified(false)
                  onReview(request.id, 'issue', verified)
                }}
              >
                {pending
                  ? 'Saving…'
                  : request.status === 'issued'
                    ? 'Replace reset link'
                    : 'Generate reset link'}
              </Button>
              {request.status === 'pending' ? (
                <Button disabled={pending} onClick={() => onReview(request.id, 'decline', false)}>
                  Decline
                </Button>
              ) : null}
            </div>
            {request.status === 'issued' && !link ? (
              <p className="m-0 text-xs text-fg2">
                The link is shown only when generated. Replacing it invalidates the earlier link and
                requires ownership confirmation again.
              </p>
            ) : null}
          </>
        ) : null}
        {link ? (
          <div className="flex flex-col gap-2" role="status">
            <Notice tone="success">
              Reset link generated. Share it privately with the verified player. It expires under
              the configured recovery policy and can be used once.
            </Notice>
            <TextInput aria-label="Reset link" value={link} readOnly autoComplete="off" />
            <Button className="self-start" onClick={() => onCopy(link)}>
              Copy link
            </Button>
            <p className="m-0 text-xs text-fg2">
              No email was sent. Link issued does not mean delivered or password changed.
            </p>
          </div>
        ) : null}
      </section>
    </Card>
  )
}

/** Private Admin queue; never shows a password or a previously issued reset token. */
export function PasswordResetRequests({
  data,
  loading,
  error,
  actionError,
  pendingId,
  link,
  onRetry,
  onPage,
  onReview,
  onCopy,
}: PasswordResetRequestsProps) {
  return (
    <>
      <PageHeader
        title="Password resets"
        description="Verify account ownership through ROTRA support before generating a link. No automatic email is sent."
      />
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}
      {error ? (
        <ErrorState title="Couldn't load password reset requests." onRetry={onRetry}>
          {error}
        </ErrorState>
      ) : !data ? (
        <Skeleton label="Loading password reset requests" className="h-48" />
      ) : (
        <>
          {data.rows.length ? (
            data.rows.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                pending={!!pendingId}
                link={link?.requestId === request.id ? link.url : undefined}
                onReview={onReview}
                onCopy={onCopy}
              />
            ))
          ) : (
            <EmptyState title="No password reset requests.">
              Requests from Player Forgot password show up here.
            </EmptyState>
          )}
          <nav
            aria-label="Password reset request pages"
            className="flex flex-wrap items-center gap-3"
          >
            <Button
              disabled={loading || !!pendingId || data.page <= 1}
              onClick={() => onPage(data.page - 1)}
            >
              Previous
            </Button>
            <span className="text-[13px] text-fg2">
              Page {data.page} · {data.total} requests
            </span>
            <Button
              disabled={loading || !!pendingId || data.page * 25 >= data.total}
              onClick={() => onPage(data.page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </>
  )
}
