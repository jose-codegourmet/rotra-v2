import type { ComponentMeta } from '@rotra/ui/meta'

export const clubMemberListMeta = {
  name: 'ClubMemberList',
  description:
    'The club Members page body (P-CLUB-MEMBERS), like Queue › Saved players: Search, a Level segment, “Showing N of M” with Clear, one card per first letter with a sticky heading, and an A–Z index.',
  usage: [
    'Pass the rows that already match the search and level (filterClubMembers in @rotra/data), sorted by the name shown.',
    'Masked members (visitors, always-private) are listed without a button and never match a search.',
    'A tap reports onOpen(key); the container opens ClubMemberProfileSheet, not a page.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-MEMBERS › viewClubMembers (.sp-filters, .sp-sec, .az)',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['signed-in', 'signed-out', 'filtered', 'no-match'],
  related: ['LetterGroup', 'AlphabetIndex', 'ClubMemberGrid', 'ClubMemberProfileSheet'],
} satisfies ComponentMeta
