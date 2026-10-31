import type { ComponentMeta } from '@rotra/ui/meta'

export const contactRequestStatusChipMeta = {
  name: 'ContactRequestStatusChip',
  description:
    "Admin's contact-change status chip: Waiting for review, Approved · applying, Applied, Needs attention or Not approved, with an optional Conflict chip.",
  usage: [
    'Admin only: the Contact changes list, the review page head and the player detail request rows.',
    "Approved and applying share 'Approved · applying'; only an applied change shows Applied, and a failed one shows Needs attention.",
    "Pass conflict when the review's checks block approval (a newer request for the same field, or the contact belongs to someone else).",
    "The player's own view uses ContactRequestStatus, whose words are written for the player.",
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'REQ / reqChip(), viewContacts() Status column, viewReview() page head',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['pending', 'applying', 'applied', 'failed', 'rejected', 'conflict'],
  related: ['ContactRequestStatusNotice', 'ContactRequestList', 'ContactRequestStatus', 'Chip'],
} satisfies ComponentMeta
