'use client'

import { useClubNameRequests } from '@rotra/data/club/useClubNameRequests'
import { ActivityLog } from '@rotra/ui/activity-log'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ClubLogo } from '@rotra/ui/club-logo'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { ListRow } from '@rotra/ui/list-row'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { PageHeader } from '@rotra/ui/page-header'
import { Skeleton } from '@rotra/ui/skeleton'
import Link from 'next/link'
import { type ReactNode, useId, useMemo } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'

/**
 * Club name changes waiting on the platform owner, newest first, and the recently decided ones.
 * Review opens the club's Overview at its request card, where the decision is made (D-CLUB-NAME).
 * Skeleton rows while loading, "No name changes waiting." when there are none, Retry when the load
 * fails; a permission error denies the workspace.
 */
export function ClubNameRequests() {
  const query = useClubNameRequests()
  const requests = query.data
  const denied = useDenyOnPermissionError(query.error)
  const decidedHeadingId = useId()

  const decided = useMemo(
    () =>
      (requests?.recentlyDecided ?? []).map((event) => ({
        id: event.id,
        text: event.summary,
        at: event.at,
        actor: event.actorEmail,
      })),
    [requests],
  )

  if (denied) return null

  let pending: ReactNode
  if (query.isError) {
    pending = (
      <ErrorState
        title="Couldn't load the name changes."
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        retryLabel="Retry"
      >
        Check your connection, then try again.
      </ErrorState>
    )
  } else if (!requests) {
    pending = (
      <div aria-busy className="flex flex-col">
        {Array.from({ length: 3 }, (_, row) => (
          <div
            key={`skeleton-${row}`}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <Skeleton
              label={row === 0 ? 'Loading name changes' : undefined}
              className="size-9 flex-none rounded-lg"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="w-56 max-w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (requests.pending.length === 0) {
    pending = (
      <EmptyState title="No name changes waiting.">Requests from clubs show up here.</EmptyState>
    )
  } else {
    pending = requests.pending.map((request) => (
      <ListRow
        key={request.requestId}
        className="border-b border-border"
        leading={
          <ClubLogo
            initials={request.initials}
            logoUrl={request.logoUrl}
            tone={request.accent ? 'accent' : 'default'}
          />
        }
        title={`${request.clubName} → ${request.requestedName}`}
        subtitle={`Sent ${requestAgo(request.requestedAt)} · ${request.username}`}
        trailing={
          <Button asChild size="sm">
            <Link href={`/clubs/${request.clubId}?tab=overview#name-request`}>Review</Link>
          </Button>
        }
      />
    ))
  }

  return (
    <>
      <PageHeader
        title="Club name changes"
        description="Clubs request a new name from Club settings. It takes effect only when you approve it. Logos don't need approval."
      />
      <Card asChild>
        <section aria-label="Name changes waiting" className="flex flex-col">
          {pending}
        </section>
      </Card>
      {decided.length ? (
        <Card asChild>
          <section aria-labelledby={decidedHeadingId} className="flex flex-col gap-3">
            <h2 id={decidedHeadingId}>Recently decided</h2>
            <ActivityLog entries={decided} emptyText="" />
          </section>
        </Card>
      ) : null}
    </>
  )
}
