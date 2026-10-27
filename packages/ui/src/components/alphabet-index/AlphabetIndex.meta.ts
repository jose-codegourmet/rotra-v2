import type { ComponentMeta } from '@rotra/ui/meta'

export const alphabetIndexMeta = {
  name: 'AlphabetIndex',
  description:
    "A vertical A–Z and # rail pinned beside Saved players that jumps to a letter's group.",
  usage: [
    'Pass the letters that have players; the rest are disabled and greyed.',
    'onJump should move focus to that LetterGroup heading (letterHeadingId) so keyboard and screen-reader users land there.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › .az, .az-l',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['LetterGroup'],
} satisfies ComponentMeta
