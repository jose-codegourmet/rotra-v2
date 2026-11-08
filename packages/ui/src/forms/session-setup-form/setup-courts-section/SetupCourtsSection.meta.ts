import type { ComponentMeta } from '@rotra/ui/meta'

export const setupCourtsSectionMeta = {
  name: 'SetupCourtsSection',
  description:
    'SessionSetupForm page 1 › Courts: Courts booked and Players per court stepper cards side by side, one SetupCourtPicture per booked court in SetupCourtPictureGrid, the slot budget notice, the edit-time waitlist warnings and any court error ("… Press a court to fix it."). Pressing a picture opens the Edit Court N sheet: Court label, Planned start and Planned end date-and-time pickers ("Session start" / "Session end" when empty; a start is never before the session start) and Done; closing returns focus to the picture.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only."],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 1 (Courts)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  // Individual booking starts control dispatch; ends remain advisory.
  related: [
    'SessionSetupForm',
    'SetupDetailsSection',
    'CountStepper',
    'SetupCourtPicture',
    'Sheet',
    'DateTimePicker',
  ],
} satisfies ComponentMeta
