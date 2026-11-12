import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdentityCardMeta = {
  name: 'PlayerIdentityCard',
  description:
    'Profile identity card: the ProfileHero (5:2 Profile banner with nothing over it, then the circular picture, name and nickname), the permanent RTR ID with Copy, and the owner actions Edit profile and My player ID.',
  usage: [
    'Use as the side column of P-PUBLIC-PROFILE and P-OWN-PROFILE; never pass private contact data.',
    'The RTR ID hint never calls the ID a residence or current club.',
    'Other profiles offer Compare with me, or Compare with my results when signed out.',
    'The owner picture edit button calls onChangePicture; public profiles do not show it.',
    'The owner banner pencil (top-right of the banner) calls onChangeBanner to open BannerSheet; public profiles never show it.',
    'bannerKey (or an uploaded bannerImageUrl) picks the banner; missing = Court.',
    'Clipboard handling and toasts belong to the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile › identity card (.hero, .rtr-line, .acts)',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['public', 'own'],
  related: ['ProfileHero', 'BannerSheet', 'PlayerIdLine', 'AccountPanel', 'ProfileLayout'],
} satisfies ComponentMeta
