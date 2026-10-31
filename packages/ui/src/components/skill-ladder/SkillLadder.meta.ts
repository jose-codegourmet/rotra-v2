import type { ComponentMeta } from '@rotra/ui/meta'

export const skillLadderMeta = {
  name: 'SkillLadder',
  description: 'Nine visible bands showing a player’s shared rank level.',
  usage: ['Use in shared-rank views.'],
  prototype: { file: 'app/mocksups-app/player-app/rotra-player.html', screen: 'ladder()' },
  variants: ['default', 'stale', 'empty'],
} satisfies ComponentMeta
