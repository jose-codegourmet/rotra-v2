import type { ComponentMeta } from '@rotra/ui/meta'

export const dateBlockMeta = {
  name: 'DateBlock',
  description:
    'A small calendar-page block, the day number over the short month, at the start of a session row.',
  usage: [
    'Decorative (aria-hidden): the row beside it always spells the date out.',
    'md (52 px) for Upcoming sessions rows; lg (64 px) for the Next up card.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'P-CLUB-PAGE › .dblk' },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['md', 'lg'],
  related: ['ClubNextUpCard', 'ClubSessionList'],
} satisfies ComponentMeta
