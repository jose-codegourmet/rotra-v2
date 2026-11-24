import type { ComponentMeta } from '@rotra/ui/meta'

export const pickChipMeta = {
  name: 'PickChip',
  description:
    'A 40 px pill button for the Getting to know answers: picked chips get the accent border and a check.',
  usage: [
    'Use role="checkbox" with picked for a multi-pick chip (Shots you know).',
    'Leave role out for an action chip such as + Others; set aria-expanded when it opens something.',
    'For a single pick, wrap Radix RadioGroup.Item with pickChipClass from @rotra/ui/pick-chip/variants (FavoritePlayerChips does).',
    'For a read-only state label use Chip, not PickChip.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Onboarding › .ob-chip',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['Chip', 'ShotChips', 'FavoritePlayerChips'],
} satisfies ComponentMeta
