import type { ComponentMeta } from '@rotra/ui/meta'

export const contactChecksListMeta = {
  name: 'ContactChecksList',
  description:
    "The 'Checks before approving' card on the Admin contact review: requested contact linked to another player, a newer request, the original contact changed, or another change still being applied.",
  usage: [
    'Admin only, on A-CONTACT-REVIEW while the request waits for review.',
    'Pass checks computed upstream; any failing check shows the footer and the screen keeps Approve off. Decline stays available.',
    'Another player is named by name and RTR ID only, never by their phone or email. Nothing offers to merge players.',
    'Pass/fail is an icon plus the sentence itself, never colour alone.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: "A-CONTACT-REVIEW › viewReview() › 'Checks before approving' (checks())",
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['all-pass', 'linked-elsewhere', 'newer-request', 'original-changed', 'in-progress'],
  related: [
    'RequestedChangeCard',
    'ApprovalScopeCard',
    'ContactVerificationNote',
    'ContactRequestStatusChip',
  ],
} satisfies ComponentMeta
