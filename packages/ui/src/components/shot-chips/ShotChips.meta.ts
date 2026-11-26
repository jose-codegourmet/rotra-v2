import type { ComponentMeta } from '@rotra/ui/meta'

export const shotChipsMeta = {
  name: 'ShotChips',
  description:
    'The Shots you know picker: 12 listed shots plus + Others, where a player adds up to 6 shots of their own.',
  usage: [
    'Controlled: value is the picked listed shots, ownShots the player’s own; the screen saves both (ownShots is skills_other).',
    '+ Others opens Add a shot with an Add button (Enter also adds). Own shots show as picked chips with a remove x.',
    'Rules live in validateOwnShot (@rotra/ui/shot-chips/helpers): 24 characters, no repeat of the list or of an own shot (any case), 6 own at most. Errors: Type a shot first. · Keep it to 24 characters or fewer. · That shot is already on the list. · You can add up to 6 of your own.',
    'Put a StepBanner above it on the onboarding step. Used in onboarding step 3 and Edit profile › Playing style.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Onboarding step 3 › pickSkills (.ob-chip, .ob-chip.own, .ob-x)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/business_logic/product/player-information/modules/identity/README.md',
    'docs/mockup-changes/2026-11-19-player-shots-others.md',
  ],
  related: ['PickChip', 'StepBanner', 'FavoritePlayerChips'],
} satisfies ComponentMeta
