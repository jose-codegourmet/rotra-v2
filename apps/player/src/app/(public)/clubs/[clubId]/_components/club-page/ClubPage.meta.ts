import type { ComponentMeta } from '@rotra/ui/meta'
export const clubPageMeta = {
  name: 'ClubPage',
  description:
    "P-CLUB-PAGE: a club's public page: hero with stat cards, Next up, Upcoming sessions, the Calendar (month view with the complete schedule) and Members.",
  usage: [
    'Rendered by /clubs/[clubId] (served per request, never indexed). An unknown club calls notFound().',
    'Join this club opens the club’s current invite link; Share club page copies the page link.',
    'A member tap opens MemberProfile (signed in only; masked members have no button).',
    'Two columns from 920 px; stacked on phones.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › viewClub',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: [
    'loading',
    'error',
    'not-found',
    'signed-out',
    'signed-in',
    'no-sessions',
    'no-members',
  ],
} satisfies ComponentMeta
