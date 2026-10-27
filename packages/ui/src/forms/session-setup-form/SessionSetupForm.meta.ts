import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionSetupFormMeta = {
  name: 'SessionSetupForm',
  description:
    'Q-SETUP: the three-page Create session / Edit preparation wizard with the step bar, page validation, footer actions and the Details, Courts, Formats and mode, Minimum games, Financials (slot) and Notes and review sections.',
  usage: [
    'The container owns useCreateQueueSession / useUpdateQueueSession, the date and venue dialogs (set through the ref handle), the clash View it dialog and the toasts.',
    'getOccurrences and computeEstimate are the rules from @rotra/data passed in, so the form stays free of runtime data imports.',
    'Only page 1 is required; Next validates the current page, saving validates every page and opens the first with an error.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'SetupStepBar',
    'RepeatSchedulePanel',
    'ClashNotice',
    'VenuePickerSheet',
    'ChooseDateSheet',
  ],
} satisfies ComponentMeta
