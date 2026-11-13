import type { ComponentMeta } from '@rotra/ui/meta'

export const clubProfileCardMeta = {
  name: 'ClubProfileCard',
  description:
    'D-CLUB-PROFILE: the club variant of the profile card, built on ProfileBannerCard in a header-less Sheet. The top half of the default banner, the round club logo centred on its bottom edge with a surface ring, the bold club name with a muted line, a chip row, an optional description, About (or Admin’s plain detail list), then anything else; footer Close and the open action.',
  usage: [
    'Queue (session page organizer line): chips ROTRA club and Happening now; About Members, Sessions in YEAR, Next up; action Open club page, href in a new tab.',
    'Player (profile Clubs card): chips N members, Your club, Happening now; About Based in, Members, Next up; action Open club page with onClick (same tab).',
    'Admin (Clubs and licenses rows): side panel (`side`), 72 px logo, chips access chip, Running now, Free · tester; plainAbout with Founded in, Address, Set up, Plan, Until, Price; children for the Running now section; action Open club.',
    'Clubs pick no banner yet: pass the resolved default banner (bannerKey / bannerImageUrl), else Court.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.clubCard (Queue); rotra-player.html SHEETS.clubCard; rotra-admin.html clubCardSheet',
  },
  docs: ['docs/screens/product/dialogs.md'],
  related: ['ProfileBannerCard', 'ClubLogo', 'Sheet', 'PublicSessionHero'],
} satisfies ComponentMeta
