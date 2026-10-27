import type { ComponentMeta } from '@rotra/ui/meta'

export const sharedRankCardMeta = {
  name: 'SharedRankCard',
  description: 'Shows the public shared rank, global position, status and visible skill ladder.',
  usage: ['Use on public and own Player Information profiles.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'Profile › Shared rank' },
  related: ['SkillLadder', 'EligibilityCard'],
} satisfies ComponentMeta
