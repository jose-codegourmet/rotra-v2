import type { ComponentMeta } from '@rotra/ui/meta'
export const playerAboutCardMeta = {
  name: 'PlayerAboutCard',
  description:
    'The About card: playing style, self-reported experience and social links, with own and public empty copy.',
  usage: [
    'Use on P-PUBLIC-PROFILE and P-OWN-PROFILE; never pass private contact data.',
    'Open decision (Profile editing: social visibility): links are shown publicly, the prototype placeholder.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
