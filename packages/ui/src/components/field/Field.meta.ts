import type { ComponentMeta } from '@rotra/ui/meta'

export const fieldMeta = {
  name: 'Field',
  description:
    'Wraps one form control with its label, optional hint and inline error, and wires them together for screen readers.',
  usage: [
    'Wrap every TextInput, Textarea, Select, DatePicker and TimeField in a Field; the control picks up its id, aria-describedby and aria-invalid automatically.',
    'Mark optional fields with optional; never make scores, social links or financial fields required.',
    'Pass the error message from React Hook Form (fieldState.error?.message); it is announced without moving focus.',
    'Checkbox and Switch carry their own label and do not need a Field.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Session setup › .field, .hint, .err (also rotra-admin.html form sheets)',
  },
  docs: [
    'docs/coding-conventions.md#6-forms',
    'docs/screens/product/experience-contract.md#accessibility-and-interaction',
  ],
  related: ['TextInput', 'Textarea', 'Select', 'DatePicker', 'TimeField'],
} satisfies ComponentMeta
