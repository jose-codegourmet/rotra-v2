import type { ComponentMeta } from '@rotra/ui/meta'

export const contactRequestsPageMeta = {
  name: 'ContactRequestsPage',
  description:
    'A-CONTACT-REQUESTS container: useContactRequests with the status filter (status) held in the URL, the Filter by status SegmentedControl with per-status counts, and a DataTable of PlayerIdentityCell (request), the change, when it was sent, ContactRequestStatusChip (Conflict when blocked) and the next permitted action.',
  usage: [
    'Rendered by /requests/contact-changes, which awaits searchParams status (pending, applying, failed, applied, rejected or all; anything else → pending) and passes it in. Switching the filter router.replaces ?status= (omitted for Waiting).',
    'The action button and the whole row open /requests/contact-changes/{requestId}?from={encoded status query} (no from for Waiting); the review back link uses from to restore the filter.',
    'Applying holds approved and applying requests; Not approved (rejected) never counts as Applied. A request blocked by a failing check (a newer request for the same field, a contact linked elsewhere, a changed original) shows Conflict and "Review · blocked".',
    'While another filter loads, the previous rows stay (keepPreviousData); the list polls while a change is being applied. Skeleton rows until the first answer (contact-changes/loading.tsx covers the route load).',
    'Empty: "Nothing waiting for review." on Waiting, else "No requests here."; "Requests from players show up here." on All, else "Try another status." (prototype). A failed load shows ErrorState with Retry and keeps the filter. A permission error denies the workspace (useDenyOnPermissionError).',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'viewContacts (Contact changes)',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  related: [
    'PageHeader',
    'DataTable',
    'EmptyState',
    'ErrorState',
    'SegmentedControl',
    'PlayerIdentityCell',
    'ContactRequestStatusChip',
  ],
} satisfies ComponentMeta
