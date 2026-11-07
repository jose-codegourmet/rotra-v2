import type { ComponentMeta } from '@rotra/ui/meta'

export const cancelledRecordRosterMeta = {
  name: 'CancelledRecordRoster',
  description:
    'The read-only roster and waitlist on a cancelled session record: player cards with level and Paid / Not paid, then a numbered waitlist.',
  usage: [
    'Use under the cancelled SessionRecordHeader (Q-HISTORY, cancelled form). It has no controls: payment marks stay as they were and refunds happen outside ROTRA.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › cancelledRecord() (.pgrid roster, .pub-wait waitlist)',
  },
  docs: ['docs/screens/product/modules/queue/results-sharing.md'],
  variants: ['with waitlist', 'nobody joined'],
  related: ['SessionRecordHeader', 'RecordPlayerCard', 'PublicParticipants'],
} satisfies ComponentMeta
