import type { ComponentMeta } from '@rotra/ui/meta'

export const choiceGroupMeta = {
  name: 'ChoiceGroup',
  description:
    'Option cards with a bold title and a muted description, picked one at a time (session mode, which team won) or several at once.',
  usage: [
    'Use type="single" when exactly one option applies (Chill / Fair / Hard); a second tap does not clear it.',
    'Use type="multiple" for independent options shown as cards.',
    'Use eyebrow for a small label above the title, as the winner choice shows "Team A".',
    'For short labels with no description use SegmentedControl.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Session setup › Formats and mode (.choices / .choice); Match result › winner',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  variants: ['single', 'multiple'],
  related: ['SegmentedControl', 'Checkbox'],
} satisfies ComponentMeta
