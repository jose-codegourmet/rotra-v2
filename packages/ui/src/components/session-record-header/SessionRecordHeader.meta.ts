import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionRecordHeaderMeta = {
  name: 'SessionRecordHeader',
  description:
    'Header of the read-only session record: the "Session record · read-only" label, title, date · time · venue, the state chips and the totals tiles. A cancelled session shows a Cancelled chip, when it was cancelled, the reason (or "No reason given.") and Joined / Waitlist / Marked paid / Courts.',
  usage: [
    'Use once at the top of a completed, invalid or cancelled session record, under the Breadcrumb.',
    'A completed session shows Completed plus Results published / Results private; an invalid session shows only Invalid session and "—" for Games; a cancelled session shows Cancelled and the reason notice, with no tabs following it.',
    'Pass when, length and cancelledWhen already formatted; the component never formats dates itself.',
    'Do not use for the live console or the private results page (Session results · private).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › viewHistory() / cancelledRecord()',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/session-finalization.md#q-invalid-session--no-official-result',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  variants: ['completed', 'invalid', 'cancelled'],
  related: ['Chip', 'Card', 'Notice', 'Breadcrumb', 'Tabs', 'PageHeader'],
} satisfies ComponentMeta
