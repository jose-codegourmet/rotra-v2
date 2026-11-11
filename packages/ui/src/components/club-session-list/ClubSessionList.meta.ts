import type { ComponentMeta } from '@rotra/ui/meta'

export const clubSessionListMeta = {
  name: 'ClubSessionList',
  description:
    "The public club page's Upcoming sessions card: the sessions after the Next up card, each with a date block and a Scheduled or Happening now chip.",
  usage: [
    'Pass every upcoming count and the rest (soonest first, the Next up session left out). Scheduled and live only, never cancelled.',
    "One upcoming session reads “That's the only one scheduled so far.”; none reads No upcoming sessions.",
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › Upcoming sessions (.urow)',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['several', 'only-one', 'empty'],
  related: ['ClubNextUpCard', 'DateBlock', 'MySessionsCard'],
} satisfies ComponentMeta
