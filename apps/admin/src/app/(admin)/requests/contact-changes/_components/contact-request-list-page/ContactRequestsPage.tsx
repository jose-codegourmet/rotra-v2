'use client'

import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { ContactRequestFilter } from '@rotra/data/contact-change-request/types'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { contactRequestColumns } from './ContactRequests.columns'

/** The list's status filter as a query string ("status=failed"); '' for the default, Waiting. */
function listQuery(status: ContactRequestFilter): string {
  return status === 'pending' ? '' : new URLSearchParams({ status }).toString()
}

/** The request's review URL; `from` brings the back link to the same status filter. */
function reviewHref(requestId: string, query: string): string {
  return query
    ? `/requests/contact-changes/${requestId}?from=${encodeURIComponent(query)}`
    : `/requests/contact-changes/${requestId}`
}

/**
 * A-CONTACT-REQUESTS: every contact-change request, filtered by status (kept in the URL), newest
 * first, each with its next permitted action. A row opens the review for that request's permanent
 * player ID, never a name match. Skeleton rows until the first answer, an empty filter suggests
 * another status, a failed load shows Retry and keeps the filter; a permission error denies the
 * workspace.
 */
export function ContactRequestsPage({ status: initialStatus }: { status: ContactRequestFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState(initialStatus)
  // keepPreviousData: the last rows stay on screen while another filter loads.
  const list = useContactRequests({ status })
  const { offline } = useAdminConnectivity()
  // The inbox: pull down (or come back to the tab) refreshes it, once every 10 seconds (mockup change 2026-11-12).
  const refreshing = useThrottledRefresh(() => list.refetch(), { refreshOnReturn: true })
  const denied = useDenyOnPermissionError(list.error)
  const query = listQuery(status)
  const columns = useMemo(
    () => contactRequestColumns((request) => reviewHref(request.requestId, query)),
    [query],
  )

  const update = (next: ContactRequestFilter) => {
    setStatus(next)
    const nextQuery = listQuery(next)
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }
  const counts = list.data?.counts

  if (denied) return null

  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      offline={offline}
      refreshing={refreshing.isRefreshing}
      updatedLabel={updatedAt(list.dataUpdatedAt)}
    >
      <PageHeader
        title="Contact changes"
        description="Players ask to change the phone number or email they sign in with. Nothing changes until you approve it and the change is applied."
      />
      <SegmentedControl
        aria-label="Filter by status"
        value={status}
        onChange={(value) => update(value as ContactRequestFilter)}
        options={[
          { value: 'pending', label: 'Waiting', count: counts?.pending },
          { value: 'applying', label: 'Applying', count: counts?.applying },
          { value: 'failed', label: 'Needs attention', count: counts?.failed },
          { value: 'applied', label: 'Applied', count: counts?.applied },
          { value: 'rejected', label: 'Not approved', count: counts?.rejected },
          { value: 'all', label: 'All', count: counts?.all },
        ]}
      />
      <Card asChild>
        <section>
          <DataTable
            aria-label="Contact changes"
            columns={columns}
            data={list.data?.rows ?? []}
            getRowId={(request) => request.requestId}
            onRowClick={(request) => router.push(reviewHref(request.requestId, query))}
            loading={!list.data && !list.isError}
            error={
              list.isError ? (
                <ErrorState
                  title="Couldn't load the contact changes."
                  onRetry={() => void list.refetch()}
                  retrying={list.isFetching}
                  retryLabel="Retry"
                >
                  Check your connection, then try again.
                </ErrorState>
              ) : undefined
            }
            empty={
              <EmptyState
                title={status === 'pending' ? 'Nothing waiting for review.' : 'No requests here.'}
              >
                {status === 'all' ? 'Requests from players show up here.' : 'Try another status.'}
              </EmptyState>
            }
          />
        </section>
      </Card>
    </PullToRefresh>
  )
}

const updatedAt = (at: number) =>
  at ? new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined
