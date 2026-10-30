import type { ComponentMeta } from '@rotra/ui/meta'

export const contactReviewMeta = {
  name: 'ContactReview',
  description:
    'A-CONTACT-REVIEW container: useContactRequest for one request (its player, applied contacts and, while pending, its checks); a header with ContactRequestStatusChip (+ Conflict) and "{Phone number|Email} change for {name}", ContactRequestStatusNotice for non-pending statuses, and a two-column layout (main + 340 px side at 1040 px and wider) of RequestedChangeCard, ContactChecksList, ContactVerificationNote and the action row beside CurrentContactsCard and ApprovalScopeCard.',
  usage: [
    'Rendered by /requests/contact-changes/[requestId], which awaits params and searchParams from (the list query) and passes them in, keyed by requestId. Back ("Contact changes" and "Back without deciding") goes to /requests/contact-changes plus from, restoring the status filter.',
    'Pending: Back without deciding · Decline (danger) · Approve (primary, disabled while any check fails); Decline and Approve open ContactDecisionSheets. Applying: Check status ("Checking…", useCheckContactApplication). Needs attention: Retry application (useRetryContactApplication, the same request). Applied and Not approved have no actions.',
    'The detail polls while a change is applied. When it settles the page toasts "Applied. {first} now signs in with {to}." or "Not applied. {first} still signs in with the old {field}." — never a "Contact changed" message just because the approval was saved.',
    'Checks: the other player opens /players/{id}; "Review that one instead" opens the newer request, keeping from. The player name in Current contacts opens /players/{id}.',
    'Offline, Check status toasts CONTACT_CHECK_OFFLINE_ERROR and Retry application toasts ADMIN_OFFLINE_ERROR without sending anything.',
    'Verification evidence is an open decision: ContactVerificationNote is the placeholder. Clarification requests and notifications are not built.',
    'While the request loads, the back link and ContactReviewSkeleton show (also used by [requestId]/loading.tsx). An unknown id calls notFound() → not-found.tsx "Request not found." under the back link. A failed read shows ErrorState with Retry. A permission error denies the workspace (useDenyOnPermissionError).',
    'Offline the review stays readable under AdminOfflineBand: Approve and Decline show ADMIN_OFFLINE_ERROR inside the sheet, Retry application toasts it, Check status toasts CONTACT_CHECK_OFFLINE_ERROR; nothing is sent and no success toast shows. If the checks fail when an approval is committed, the approve sheet stays open with CONTACT_REVIEW_STALE_ERROR and the checks refetch.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'viewReview (contact review); ACT.checkApply / retryApply; runApply',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  related: [
    'Breadcrumb',
    'PageHeader',
    'ContactRequestStatusChip',
    'ContactRequestStatusNotice',
    'RequestedChangeCard',
    'ContactChecksList',
    'ContactVerificationNote',
    'CurrentContactsCard',
    'ApprovalScopeCard',
    'ContactDecisionSheets',
    'ErrorState',
    'EmptyState',
    'Skeleton',
  ],
} satisfies ComponentMeta
