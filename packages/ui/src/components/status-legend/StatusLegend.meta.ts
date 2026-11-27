import type { ComponentMeta } from '@rotra/ui/meta'

export const statusLegendMeta = {
  name: 'StatusLegend',
  description:
    'The Status key above the Players cards: "Status", then each pill icon with its words: Free, waiting · In queue · Getting ready · Playing · Away. Bordered, on the surface, wraps on phones and is hidden from screen readers.',
  usage: [
    'Each key is the real StatusPill icon (iconOnly), so the colours and icons always match the pills on the cards.',
    'Decorative (aria-hidden): every pill already carries its full words as its accessible name.',
    'Place it between the filter row and the card grid in the Players view; hide it for the Waitlist panel and for an empty list (Q30.5 wires it).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.st-legend)',
  },
  docs: [
    'docs/mockup-changes/2026-11-26-queue-player-status-icons.md',
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
  ],
  related: ['StatusPill', 'PlayerPoolCard', 'PlayerPoolToolbar'],
} satisfies ComponentMeta
