import type { ComponentMeta } from '@rotra/ui/meta'

export const notRecordedChipMeta = {
  name: 'NotRecordedChip',
  description:
    'The warn "Not recorded" chip of a session with Record games off. It sits in the live console header beside the Min games chip and in the session record header instead of Results published / private.',
  usage: [
    'Show it only when the session has Record games off; a session saved before the option existed reads as recorded and shows no chip.',
    'SessionRecordHeader already shows it for a completed session with recorded={false}; the console header places it itself.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: "Q-CONSOLE › console header chips; Q-HISTORY › chip('Not recorded', 'warn')",
  },
  docs: [
    'docs/business_logic/product/queue/modules/sessions/README.md#record-games',
    'docs/mockup-changes/2026-11-18-queue-record-games-option.md',
  ],
  related: ['Chip', 'SessionRecordHeader'],
} satisfies ComponentMeta
