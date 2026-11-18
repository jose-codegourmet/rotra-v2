import type { ComponentMeta } from '@rotra/ui/meta'

export const setupFormatsSectionMeta = {
  name: 'SetupFormatsSection',
  description:
    'SessionSetupForm page 2 › Formats and mode: Singles and Doubles switches (warning when both are off) the Chill / Fair / Hard mode cards with their descriptions, and the Record games switch (on by default; a read-only On / Off chip once the session has started) with its hint.',
  usage: [
    'Rendered inside SessionSetupForm’s FormProvider only.',
    'Pass recordGamesLocked once the session has started: Record games becomes a read-only On / Off chip with "Record games can\'t change after Start." in the hint.',
    'Pass an explicit allowedRequestFormats set and callback to show the Players can request pills; defaults and form wiring are supplied by the caller.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 2 (Formats and mode), MODES',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupMinimumSection', 'ChoiceGroup', 'Switch', 'Chip'],
} satisfies ComponentMeta
