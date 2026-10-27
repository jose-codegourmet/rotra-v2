import type { ComponentMeta } from '@rotra/ui/meta'

export const eligibilityCardMeta = {
  name: 'EligibilityCard',
  description: 'Explains a player’s progress toward overall leaderboard eligibility.',
  usage: ['Use on the Player Information eligibility surface.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'eligibility()' },
} satisfies ComponentMeta
