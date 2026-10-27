import type { ComponentMeta } from '@rotra/ui/meta'

export const letterGroupMeta = {
  name: 'LetterGroup',
  description:
    'A contacts-style section of Saved players: a sticky letter heading with the count, over a grid of player cards.',
  usage: [
    'One per first letter that has players, in A–Z order with "#" last.',
    'AlphabetIndex jumps here: focus document.getElementById(letterHeadingId(letter)).',
    'The grid keeps at least two cards across on a 375 px phone.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › .sp-sec, .sp-letter, .sp-grid',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['AlphabetIndex', 'SavedPlayerCard'],
} satisfies ComponentMeta
