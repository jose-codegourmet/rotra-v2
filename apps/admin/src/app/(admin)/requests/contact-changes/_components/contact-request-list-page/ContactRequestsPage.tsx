'use client'

import type { ContactRequestFilter } from '@rotra/data/contact-change-request/types'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { PageHeader } from '@rotra/ui/page-header'
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
 * player ID, never a name match. Loading, empty and error states: A03.11.
 */
export function ContactRequestsPage({ status: initialStatus }: { status: ContactRequestFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState(initialStatus)
  // keepPreviousData: the last rows stay on screen while another filter loads.
  const list = useContactRequests({ status })
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
    <>
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
          />
        </section>
      </Card>
    </>
  )
}
