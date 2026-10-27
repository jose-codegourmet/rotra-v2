import type { ComponentMeta } from '@rotra/ui/meta'

export const setupMinimumSectionMeta = {
  name: 'SetupMinimumSection',
  description:
    'SessionSetupForm page 2 › Minimum games: Calculated / Set by you chip, expected players (or the roster count), the low–high estimate with its explanation, the minimum field, Set it yourself / Use the estimate.',
  usage: [
    "Rendered inside SessionSetupForm's FormProvider only. The estimate rule (estimateMinimum in @rotra/data) is passed in as computeEstimate.",
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 3 (Minimum games), estimateGames()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupFormatsSection', 'SessionSetupCard'],
} satisfies ComponentMeta
