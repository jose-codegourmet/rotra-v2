import type { ComponentMeta } from '@rotra/ui/meta'

export const levelPillMeta = {
  name: 'LevelPill',
  description:
    'A club player\'s playing level: three small bars for the band and the full level name ("Intermediate Mid"), or "No level yet".',
  usage: [
    "Use on saved-player cards, profiles and roster rows. The level is the club's assessment, not a computed rank.",
    'The bars only reinforce the text; the name is always shown.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Saved players › card (.sp-level, .lvl-bars)',
  },
  docs: ['docs/product-terms.md'],
  related: ['SavedPlayerCard', 'LevelSelect'],
} satisfies ComponentMeta
