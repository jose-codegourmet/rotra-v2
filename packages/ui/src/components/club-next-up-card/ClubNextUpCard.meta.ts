import type { ComponentMeta } from '@rotra/ui/meta'

export const clubNextUpCardMeta = {
  name: 'ClubNextUpCard',
  description:
    "The public club page's highlighted card for the soonest session: a date block, Next up or Happening now, the title, date and time, and Open session page or Watch live.",
  usage: [
    'Only when the club has an upcoming (scheduled or live) session; with none, show no card.',
    'The button opens the public session page. On phones it spans the card.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › .next-card',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['scheduled', 'live'],
  related: ['ClubSessionList', 'DateBlock', 'ClubPageHero'],
} satisfies ComponentMeta
