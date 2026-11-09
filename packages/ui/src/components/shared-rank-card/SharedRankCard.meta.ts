import type { ComponentMeta } from '@rotra/ui/meta'

export const sharedRankCardMeta = {
  name: 'SharedRankCard',
  description: 'Shows the public shared rank, global position, status and visible skill ladder.',
  usage: [
    'The own profile can pass onShare; Share stays hidden without a rank.',
    'Use on public and own Player Information profiles.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile › Shared rank',
  },
  related: ['SkillLadder', 'EligibilityCard'],
} satisfies ComponentMeta
