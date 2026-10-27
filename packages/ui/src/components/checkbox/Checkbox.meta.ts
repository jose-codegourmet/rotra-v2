import type { ComponentMeta } from '@rotra/ui/meta'

export const checkboxMeta = {
  name: 'Checkbox',
  description: 'A bordered row with a checkbox, a bold label and an optional muted description.',
  usage: [
    'Use for independent yes/no choices in a list, such as which result slides to include.',
    'For presence and formats the prototypes use Switch; follow the screen doc.',
    'With React Hook Form pass checked={field.value} and onChange={field.onChange}.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Publish results › Standings / Awards / Include Off Day (.check)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['Switch', 'ChoiceGroup'],
} satisfies ComponentMeta
