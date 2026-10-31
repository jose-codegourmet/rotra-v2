import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdentityCardMeta = {
  name: 'PlayerIdentityCard',
  description:
    'Profile identity card: picture or initials, name, nickname, the permanent RTR ID with Copy, and the owner actions Edit profile and My player ID.',
  usage: [
    'Use as the side column of P-PUBLIC-PROFILE and P-OWN-PROFILE; never pass private contact data.',
    'The RTR ID hint never calls the ID a residence or current club.',
    'Clipboard handling and toasts belong to the container.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Profile › identity card (.hero, .rtr-line, .acts)',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['public', 'own'],
  related: ['PlayerIdLine', 'AccountPanel', 'ProfileLayout'],
} satisfies ComponentMeta
