import type { ComponentMeta } from '@rotra/ui/meta'

export const levelDiffIndicatorMeta = {
  name: 'LevelDiffIndicator',
  description:
    'The hint under a level select comparing the club level with the Player Information suggestion: may be too high (warn), may be too low (error) or matches (accent); nothing without both.',
  usage: [
    'Place under a LevelSelect and link them with aria-describedby. It is a prompt, never a block.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › levelDiff() (.lv-diff)',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  variants: ['higher', 'lower', 'same'],
  related: ['LevelSelect', 'RosterRow'],
} satisfies ComponentMeta
