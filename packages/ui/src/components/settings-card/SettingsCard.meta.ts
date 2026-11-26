import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsCardMeta = {
  name: 'SettingsCard',
  description:
    'A card on the Queue Settings tab: title, an optional chip and header action, big-count tiles, label-value rows, free content and bottom actions. Game rules, Players, Costs and Notes use it.',
  usage: [
    'Lay four in a 2×2 grid (Game rules | Players, then Costs | Notes); one column at 760 px and narrower. The card fills its grid cell, so a row has equal heights.',
    'Put "Fixed after start" once, as the chip on Game rules. Rows: label on the left, semi-bold value, an optional muted note under the value.',
    'Notes always shows; with no notes the child text reads "No notes for tonight.".',
    'The card is layout only: the screen passes the values and wires the buttons.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › Settings › liveSettings() (.ls-card, .ls-grid)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  related: ['Card', 'Chip', 'KeyValueList', 'ValueTiles'],
} satisfies ComponentMeta
