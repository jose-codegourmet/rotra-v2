import type { ComponentMeta } from '@rotra/ui/meta'

export const requestedChangeCardMeta = {
  name: 'RequestedChangeCard',
  description:
    "The Requested change card on the Admin contact review: Current → Requested contact in mono, when it was sent and whether it came from the player's account or the owner entered it.",
  usage: [
    'Admin only, first card of A-CONTACT-REVIEW for every status.',
    "An empty current value shows 'Not set'.",
    "Pass the player's nickname or first name for the Came from line.",
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-CONTACT-REVIEW › viewReview() › Requested change',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/database_design/product/admin/modules/configuration-requests.md#player_contact_change_requests',
  ],
  variants: ['app', 'owner'],
  related: ['ChangeCompare', 'KeyValueList', 'CurrentContactsCard', 'ContactRequestStatusNotice'],
} satisfies ComponentMeta
