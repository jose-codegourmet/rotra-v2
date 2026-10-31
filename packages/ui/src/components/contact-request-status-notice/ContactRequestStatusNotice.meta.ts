import type { ComponentMeta } from '@rotra/ui/meta'

export const contactRequestStatusNoticeMeta = {
  name: 'ContactRequestStatusNotice',
  description:
    'The status banner on the Admin contact review: approved and applying, applied, approved but not applied, or not approved. Nothing while the request waits for review.',
  usage: [
    'Admin only, under the A-CONTACT-REVIEW page head next to ContactRequestStatusChip.',
    'Applying shows a spinner (static under reduced motion); the bold sentence says what is happening, so the state is never colour alone.',
    'Failed means approved but not applied: it is never green and never says the contact changed.',
    "Pass the player's nickname or first name; contact values render in mono.",
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CONTACT-REVIEW › viewReview() status notices',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['applying', 'applied', 'failed', 'rejected'],
  related: ['ContactRequestStatusChip', 'Notice', 'Spinner', 'RequestedChangeCard'],
} satisfies ComponentMeta
