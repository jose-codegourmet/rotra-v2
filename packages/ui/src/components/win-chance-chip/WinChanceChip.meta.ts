import type { ComponentMeta } from '@rotra/ui/meta'

export const winChanceChipMeta = {
  name: 'WinChanceChip',
  description:
    'Win chance: each pair’s chance to win a match, for the Queue Master only. With `team` it is one pair’s percent ("61%") beside that pair on a queue or draft tile; without it both pairs share one chip, left pair first ("39% · 61%"), on a court card. The stronger pair reads brighter and a Favored pair (65% or more) takes the accent.',
  usage: [
    'Pass the WinChance from `winChance()` in `@rotra/data/match/win-chance`; never compute a percent in a component.',
    'Pass `onOpen` (open WinChanceDialog) to make the chip a button; it stops the click and keys from reaching a parent tile.',
    'Never render it on the public session page, in the Player app, in results or in exports.',
    'MatchCard, CourtCard and MatchCourt place it themselves from their `winChance` prop.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › match cards › wcPair, wcChip (.chip.wc)',
  },
  docs: [
    'docs/business_logic/product/queue/modules/queueing/README.md#win-chance',
    'docs/mockup-changes/2026-11-27-queue-win-chance.md',
  ],
  related: ['WinChanceDialog', 'Chip', 'MatchCard', 'CourtCard', 'MatchCourt'],
} satisfies ComponentMeta
