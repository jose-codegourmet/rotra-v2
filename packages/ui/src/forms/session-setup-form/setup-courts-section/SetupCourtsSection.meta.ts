import type { ComponentMeta } from '@rotra/ui/meta'

export const setupCourtsSectionMeta = {
  name: 'SetupCourtsSection',
  description:
    'SessionSetupForm page 1 › Courts: the court count stepper with one label field per court, players per court, the slot budget notice and the edit-time waitlist warnings.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only."],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 1 (Courts)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupDetailsSection', 'CountStepper'],
} satisfies ComponentMeta
