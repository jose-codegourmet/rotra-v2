import type { ComponentMeta } from '@rotra/ui/meta'

export const swappablePlayerMeta = {
  name: 'SwappablePlayer',
  description:
    "Wraps one player element inside a SwapSidesArea so it can be dragged onto a player on the other team (mouse or pen after a few pixels; touch after a press and hold) or moved across with ← / →. A copy follows the pointer, the source dims and only the other team's players show the dashed accent outline.",
  usage: [
    'Wrap a PlayerFaceButton on a queue card, a player row in Suggest or Start match, or a slot button in the lineup editor; give it the team and position.',
    'Mark an empty lineup-editor slot with empty: it cannot be dragged and accepts a drop only when the area allows empty targets.',
    "Keep the child's own click: a plain click still opens the profile or the slot picker. The child may add the hint to its own label (PlayerFaceButton does with swap).",
    'Outside a SwapSidesArea it is a plain wrapper with no behaviour.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Live console › Queue tab › [data-swap] players (.swap-ghost, .swap-src, .swap-over)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/experience-contract.md',
  ],
  related: ['SwapSidesArea', 'PlayerFaceButton', 'MatchCard'],
} satisfies ComponentMeta
