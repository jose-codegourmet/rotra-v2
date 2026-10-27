import type { ComponentMeta } from '@rotra/ui/meta'

export const countStepperMeta = {
  name: 'CountStepper',
  description:
    'A − count + control for small whole numbers such as players per court or number of repeat sessions.',
  usage: [
    'Name both buttons for what they change ("Fewer players per court", "More players per court").',
    'The buttons disable at min and max. Inside React Hook Form pass field.value, field.onChange and field.ref.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Club settings › Session defaults › Players per court; Session setup › Number of sessions',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  variants: ['md', 'lg'],
  related: ['Field'],
} satisfies ComponentMeta
