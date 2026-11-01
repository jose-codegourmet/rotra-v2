import type { ComponentMeta } from '@rotra/ui/meta'

export const checkboxMeta = {
  name: 'Checkbox',
  description:
    'A bordered checkbox row, or compact standalone selection with a screen-reader label.',
  usage: [
    'Use compact for player selection in tables and card headers; retain a player-specific label.',
    'Use for independent yes/no choices in a list, such as which result slides to include.',
    'For presence and formats the prototypes use Switch; follow the screen doc.',
    'With React Hook Form pass checked={field.value} and onChange={field.onChange}.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Publish results › Standings / Awards / Include Off Day (.check)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  variants: ['row', 'compact'],
  related: ['Switch', 'ChoiceGroup'],
} satisfies ComponentMeta
