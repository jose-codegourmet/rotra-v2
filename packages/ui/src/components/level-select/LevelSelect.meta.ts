import type { ComponentMeta } from '@rotra/ui/meta'

export const levelSelectMeta = {
  name: 'LevelSelect',
  description:
    'The nine playing levels grouped by Beginner / Intermediate / Advanced with full labels, placeholder "Choose a level…", a missing (error) state and a locked (disabled) state.',
  usage: [
    'Use in roster rows, Add player, Confirm player and join requests. Give it an accessible name that says whose level it is.',
    "Never pre-select a level from a self-declared band except the middle level of a join request's stated band.",
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-ASSESS › selectLevel()',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  related: ['LevelDiffIndicator', 'RosterRow', 'Select'],
} satisfies ComponentMeta
