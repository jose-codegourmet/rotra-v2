import type { ComponentMeta } from '@rotra/ui/meta'

export const favoritePlayerChipsMeta = {
  name: 'FavoritePlayerChips',
  description:
    'The Favorite player answers: 9 players and Others, one pick; Others opens a box for a typed name.',
  usage: [
    'Controlled: value is the picked player, "other" for Others; otherName holds the typed name.',
    'Pass error (“Type the player’s name, or pick another answer.”) when the screen finds Others picked with no name.',
    'Put a StepBanner above it on the onboarding step 4.',
    'For several picks use ShotChips.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Onboarding step 4 › pickFav (.ob-chip)',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['PickChip', 'ShotChips', 'StepBanner'],
} satisfies ComponentMeta
