import type { ComponentMeta } from '@rotra/ui/meta'

export const segmentedControlMeta = {
  name: 'SegmentedControl',
  description:
    'A compact row of two to four options where exactly one is on, such as Everyone / Not paid / Paid or Break-even / Custom amount.',
  usage: [
    'Use for filters and short either/or settings that change the view or a value at once.',
    'For options that need a description line use ChoiceGroup; for switching whole views use Tabs.',
    'Icon-only options (such as the Roster List | Grid toggle): set label to an Icon, iconOnly: true and ariaLabel (the accessible name and hover title).',
    'Put counts in option.count so they read as muted numbers, as the admin filters do.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Payments › Show filter; Session setup › Payment per player (.seg); Roster and levels › view toggle (.seg-ic)',
  },
  docs: [
    'docs/screens/product/experience-contract.md#layout-and-device-behavior',
    'docs/mockup-changes/2026-11-08-queue-roster-view-toggle-icons.md',
  ],
  related: ['ChoiceGroup', 'Tabs'],
} satisfies ComponentMeta
