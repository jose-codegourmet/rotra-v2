import type { ComponentMeta } from '@rotra/ui/meta'

export const nameChangeRequestCardMeta = {
  name: 'NameChangeRequestCard',
  description:
    'A club name change waiting for the platform owner: when it was sent, Current → Requested, and Reject / Approve name change.',
  usage: [
    'Render first on the club detail Overview tab, only while a request is waiting; its id is "name-request" so the dashboard Review link can scroll to it.',
    'Reject and Approve name change render only when both onReject and onApprove are passed; they open the confirmation sheets (A02.13), they never decide on their own.',
    'Pass now in stories and tests so "19 hours ago" is stable.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Overview › #name-request',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  variants: ['with actions', 'read-only'],
  related: ['ChangeCompare', 'Chip', 'Card', 'ConfirmSheet'],
} satisfies ComponentMeta
