import type { ComponentMeta } from '@rotra/ui/meta'
export const myPositionCardMeta = {
  name: 'MyPositionCard',
  description: 'The signed-in player’s avatar and position on a neutral card with an accent border, or their eligibility status.',
  usage: ['Use on the leaderboard only for a signed-in player.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-LEADERBOARD meCard()' },
  variants: ['listed', 'not-listed'],
} satisfies ComponentMeta
