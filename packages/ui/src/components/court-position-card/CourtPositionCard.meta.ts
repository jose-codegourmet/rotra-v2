import type { ComponentMeta } from '@rotra/ui/meta'

export const courtPositionCardMeta = {
  name: 'CourtPositionCard',
  description:
    'The Where you play cards (Front court, Back court, All-round): one pick, each with a Higgsfield picture on top.',
  usage: [
    'Pass art as three image paths (apps/player/public/art/onboarding/court-front, court-back, court-all .webp).',
    'The picture dims until the card is picked or hovered; a picked card shows the accent border and check.',
    'Three across from 720 px; 3:1 pictures on phones. Used in the onboarding step 2 and Edit profile › Playing style.',
    'Wraps ChoiceGroup type="single"; for plain text options use RadioChoiceList.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Onboarding step 2 › pickCourt (.ob-opt.has-art)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-19-player-court-position-art.md',
  ],
  related: ['ChoiceGroup', 'RadioChoiceList'],
} satisfies ComponentMeta
