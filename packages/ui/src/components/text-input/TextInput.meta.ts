import type { ComponentMeta } from '@rotra/ui/meta'

export const textInputMeta = {
  name: 'TextInput',
  description: 'A single-line text box: names, usernames, numbers, email and phone.',
  usage: [
    'Place inside a Field. Works with React Hook Form Controller: spread field (value, onChange, onBlur, name, ref).',
    'Use inputMode and autoComplete as the screen doc says (e.g. inputMode="numeric" for money).',
    'For several lines use Textarea; for times use TimeField.',
  ],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Shared styles › .input' },
  docs: ['docs/coding-conventions.md#6-forms'],
  related: ['Field', 'Textarea'],
} satisfies ComponentMeta
