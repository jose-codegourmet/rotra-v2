import type { ComponentMeta } from '@rotra/ui/meta'

export const genderFieldMeta = {
  name: 'GenderField',
  description:
    'The optional Gender field: a Male, Female, Not given segmented control with the match category hint.',
  usage: [
    'Used by Add player › New player and Edit details, for guests and unclaimed players only. Registered players give their own gender.',
    'Not given is the empty value (""). The container saves null for it; matches with a player whose gender is not given are Genderless.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Add player › New player; Edit details (genderField)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-19-queue-match-category-gender.md',
  ],
  variants: ['not-given', 'male', 'female', 'disabled'],
  related: ['SegmentedControl', 'Field', 'NewPlayerForm', 'EditPlayerDetailsForm'],
} satisfies ComponentMeta
