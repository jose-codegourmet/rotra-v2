import type { ComponentMeta } from '@rotra/ui/meta'

export const notRankedChipMeta = {
  name: 'NotRankedChip',
  description:
    'The warn "Not ranked" chip of a session with Record games off. It sits in the live console header beside the Min games chip and in the session record header next to Results published / private.',
  usage: [
    'Show it only when the session has Record games off; a session saved before the option existed reads as ranked and shows no chip.',
    'SessionRecordHeader already shows it for a completed session with ranked={false}; the console header places it itself.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: "Q-CONSOLE › console header chips; Q-HISTORY › chip('Not ranked', 'warn')",
  },
  docs: [
    'docs/business_logic/product/queue/modules/sessions/README.md#record-games',
    'docs/mockup-changes/2026-11-20-queue-record-games-not-ranked.md',
  ],
  related: ['Chip', 'SessionRecordHeader'],
} satisfies ComponentMeta
