import type { ComponentMeta } from '@rotra/ui/meta'

export const stepBannerMeta = {
  name: 'StepBanner',
  description:
    'The Higgsfield picture above the answers on a Getting to know step (Shots you know, Favorite player).',
  usage: [
    'Pass the image path as src and a sentence of alt text; the picture is announced as an image.',
    'Same size on every step that uses it: 12:5 on wide screens, 2:1 on phones.',
    'For the Where you play pictures use CourtPositionCard, which carries its own art.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Onboarding › .ob-banner (Shots you know, Favorite player)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-19-player-shots-others.md',
    'docs/mockup-changes/2026-11-19-player-favorite-art.md',
  ],
  related: ['ShotChips', 'FavoritePlayerChips', 'CourtPositionCard'],
} satisfies ComponentMeta
