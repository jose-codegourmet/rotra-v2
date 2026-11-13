import type { ComponentMeta } from '@rotra/ui/meta'

export const clubCardMeta = {
  name: 'ClubCard',
  description:
    'The session page’s club profile card container (D-CLUB-PROFILE): ClubProfileCard with the default banner, ROTRA club / Happening now chips and About (Members, Sessions in YEAR, Next up) from useClubPage; Open club page opens the Player app’s club page in a new tab.',
  usage: [
    'Mounted by PublicSession; PublicSessionHero onOpenClub opens it from the organizer line.',
    'Mock mode reads the club page from the mock store. Real mode has no Queue-side club page read yet, so the counts read “—”.',
  ],
  docs: ['docs/screens/product/dialogs.md', 'docs/screens/product/modules/queue/public-session.md'],
  related: ['ClubProfileCard', 'PublicSessionHero', 'PublicSession'],
} satisfies ComponentMeta
