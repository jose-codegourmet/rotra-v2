import type { ComponentMeta } from '@rotra/ui/meta'

export const setupDetailsSectionMeta = {
  name: 'SetupDetailsSection',
  description:
    'SessionSetupForm page 1 › Details: title, the Venue button and its note, then the when block: the Date button with Starts and Ends side by side (no clock icons; Ends offers only times after the start, with an "Ends the next day" switch in its time dialog and a "next day" note when on) beside a Total duration box ("4 HR", "1 HR 30 MIN", "—" while the end is invalid), then RepeatSchedulePanel (new sessions) or ClashNotice.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only; never on its own in an app."],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 0 (Details)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'SessionSetupForm',
    'SetupCourtsSection',
    'RepeatSchedulePanel',
    'ClashNotice',
    'DateTimePicker',
    'TimeField',
  ],
} satisfies ComponentMeta
