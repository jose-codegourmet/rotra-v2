import type { ComponentMeta } from '@rotra/ui/meta'

export const winChanceDialogMeta = {
  name: 'WinChanceDialog',
  description:
    'Win chance explained: two team blocks (stacked on phones) with the pair’s percent, each player’s form rating and the rows it adds up from, the team average, and a footer on how the percent follows from the gap. An Upset chip beside the title when the Favored pair lost. For the Queue Master only.',
  usage: [
    'Open it from any win chance chip or pill (their `onOpen`) with the WinChanceBreakdown from `winChanceBreakdown()` in `@rotra/data/match/win-chance`; never compute a rating or percent here.',
    'Pass `players` keyed by player id with name, shortName and photoUrl; a missing id reads "Player".',
    'It is a Sheet, so it stacks over an open sheet; Close and Escape call `onClose`.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › Win chance dialog',
  },
  docs: [
    'docs/business_logic/product/queue/modules/queueing/README.md#win-chance',
    'docs/mockup-changes/2026-11-27-queue-win-chance.md',
  ],
  related: ['WinChanceChip', 'Sheet', 'Avatar', 'Chip'],
} satisfies ComponentMeta
