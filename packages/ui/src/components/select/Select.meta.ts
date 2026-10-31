import type { ComponentMeta } from '@rotra/ui/meta'

export const selectMeta = {
  name: 'Select',
  description:
    'A dropdown to pick one option from a list, with optional groups (playing levels are grouped by Beginner, Intermediate and Advanced).',
  usage: [
    'Place inside a Field. With React Hook Form, pass field.value, field.onChange, field.onBlur, field.name and field.ref.',
    'onChange receives the value string, not an event.',
    'For two to five always-visible options use SegmentedControl or ChoiceGroup instead.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Roster › Choose a level (select.input with optgroups)',
  },
  docs: ['docs/coding-conventions.md#6-forms'],
  related: ['Field', 'SegmentedControl', 'ChoiceGroup'],
} satisfies ComponentMeta
