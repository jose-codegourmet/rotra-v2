import type { ComponentMeta } from '@rotra/ui/meta'
export const clubMembersMeta = {
  name: 'ClubMembers',
  description:
    'P-CLUB-MEMBERS: every registered member of a club, searchable by name or nickname, filterable by level, grouped by first letter with an A–Z index.',
  usage: [
    'Rendered by /clubs/[clubId]/members (served per request, never indexed). An unknown club calls notFound().',
    'Masked members (visitors, always-private) are listed without a button and never match a search.',
    'A member tap opens MemberProfile, not a page. The back link returns to the club page.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-MEMBERS › viewClubMembers',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['loading', 'error', 'not-found', 'signed-out', 'signed-in', 'no-match'],
} satisfies ComponentMeta
