import type { ComponentMeta } from '@rotra/ui/meta'

export const textareaMeta = {
  name: 'Textarea',
  description: 'A multi-line text box for notes, club descriptions and court rules.',
  usage: [
    'Place inside a Field; pass maxLength when the screen doc gives a limit.',
    'For one line use TextInput.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Club settings › Club description, Court rules (textarea.input)',
  },
  docs: ['docs/coding-conventions.md#6-forms'],
  related: ['Field', 'TextInput'],
} satisfies ComponentMeta
