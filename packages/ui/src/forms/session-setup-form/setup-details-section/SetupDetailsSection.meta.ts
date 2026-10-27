import type { ComponentMeta } from '@rotra/ui/meta'

export const setupDetailsSectionMeta = {
  name: 'SetupDetailsSection',
  description:
    'SessionSetupForm page 1 › Details: title, the Date button, Starts / Ends with the duration hint, RepeatSchedulePanel (new sessions) or ClashNotice, and the Venue button.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only; never on its own in an app."],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 0 (Details)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupCourtsSection', 'RepeatSchedulePanel', 'ClashNotice'],
} satisfies ComponentMeta
