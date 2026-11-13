import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdentityCardMeta = {
  name: 'PlayerIdentityCard',
  description:
    'Profile identity card: the ProfileHero (5:1 banner strip, the picture on its bottom edge, display name and full name), the permanent RTR ID with Copy, then the actions one full-width button per row: Edit profile, My player ID, Share profile (own), or Compare with me, Share profile (someone else).',
  usage: [
    'Use as the side column of P-PUBLIC-PROFILE and P-OWN-PROFILE; never pass private contact data.',
    'The RTR ID hint never calls the ID a residence or current club.',
    'Other profiles offer Compare with me, or Compare with my results when signed out, and Share profile (onShare) under it.',
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
