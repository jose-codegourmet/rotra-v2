import type { ComponentMeta } from '@rotra/ui/meta'

export const setupFormatsSectionMeta = {
  name: 'SetupFormatsSection',
  description:
    'SessionSetupForm page 2 › Formats and mode: Singles and Doubles switches (warning when both are off) and the Chill / Fair / Hard mode cards with their descriptions.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only."],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 2 (Formats and mode), MODES',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupMinimumSection', 'ChoiceGroup', 'Switch'],
} satisfies ComponentMeta
