import type { ComponentMeta } from '@rotra/ui/meta'

export const contactRequestListMeta = {
  name: 'ContactRequestList',
  description:
    "The Contact-change requests card on the Admin player detail: each of the player's phone or email requests with its status, when it was sent, the From → To values and the next action.",
  usage: [
    'Pass rows newest first. Each row takes its status chip as a ReactNode (ContactRequestStatusChip from A03.3, or a Chip with the label).',
    "The action label is computed upstream (prototype nextAction(): Review, 'Review · blocked', Check status, Retry application, View); the button opens the review via href or onOpen(id).",
    "An empty From shows '—'. Requested values appear only here, never in PrivateContactCard.",
    "Empty: 'No requests.'",
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-PLAYER-DETAIL › viewPlayer() › Contact-change requests',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/README.md',
  ],
  variants: ['several', 'empty'],
  related: ['Card', 'Button', 'Chip', 'PrivateContactCard', 'ContactRequestStatus'],
} satisfies ComponentMeta
