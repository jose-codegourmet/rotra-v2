import type { ComponentMeta } from '@rotra/ui/meta'

export const cancelledSessionRecordMeta = {
  name: 'CancelledSessionRecord',
  description:
    'Q-HISTORY cancelled form: the record of a session cancelled before it started. SessionRecordHeader (Cancelled chip, "Cancelled WHEN", reason, totals Joined / Waitlist / Marked paid / Courts), Open public page, then the read-only roster with Paid / Not paid and the waitlist. No tabs, games, standings or slides.',
  usage: [
    'Rendered by SessionRecord when useQueueSession reports state `cancelled`; it never calls useSessionRecord (a cancelled session has no result record). Roster, waitlist and payment marks come from useSessionRoster and useSessionPayments, read-only.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/sessions/README.md',
  ],
  related: ['SessionRecordHeader', 'CancelledRecordRoster', 'SessionRecord'],
} satisfies ComponentMeta
