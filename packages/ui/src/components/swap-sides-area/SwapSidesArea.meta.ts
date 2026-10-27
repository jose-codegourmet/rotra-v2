import type { ComponentMeta } from '@rotra/ui/meta'

export const swapSidesAreaMeta = {
  name: 'SwapSidesArea',
  description:
    'The switch-sides behaviour decided October 27, 2026: the scope inside which a player can be dragged onto someone on the other team, or moved across with ← / →, to swap the two. Renders no element; reports onSwap(from, to).',
  usage: [
    'Wrap one lineup: a queue card (QueueGrid does this per card), the Suggest sheet, the lineup editor or Start match. Put a SwappablePlayer around each player inside it.',
    'The area only reports the swap. The owner applies it: a queue card becomes protected, Suggest changes its shown lineup, the lineup editor changes its slots until Save lineup.',
    'allowEmptyTargets is for the lineup editor, where a player can also be dropped onto an empty slot on the other team.',
    'Do not use in active matches: they have no dragging; use the substitution sheet.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › Queue tab, Suggest, Edit lineup, Start match › swapSides()/pdLift()/pdMove()/pdEnd()',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/experience-contract.md',
  ],
  related: ['SwappablePlayer', 'MatchCard', 'QueueGrid', 'PlayerFaceButton'],
} satisfies ComponentMeta
