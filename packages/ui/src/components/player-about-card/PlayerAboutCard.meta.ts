import type { ComponentMeta } from '@rotra/ui/meta'
export const playerAboutCardMeta = {
  name: 'PlayerAboutCard',
  description:
    'The About card: Where they play, Shots (listed and own) and Favorite player from the getting-to-know answers, then self-reported experience and social links, with own and public empty copy.',
  usage: [
    'Where they play always shows ("You haven\'t / This player hasn\'t added this yet." when empty); Shots and Favorite player show only when answered. The free-text playing style is gone (D-2026-11-19-11).',
    'Use on P-PUBLIC-PROFILE and P-OWN-PROFILE; never pass private contact data.',
    'Open decision (Profile editing: social visibility): links are shown publicly, the prototype placeholder.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
