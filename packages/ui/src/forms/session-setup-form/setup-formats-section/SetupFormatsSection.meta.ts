import type { ComponentMeta } from '@rotra/ui/meta'

export const setupFormatsSectionMeta = {
  name: 'SetupFormatsSection',
  description:
    'SessionSetupForm page 2 › Formats and mode: Singles and Doubles switches (warning when both are off) the illustrated Chill / Fair / Hard mode cards, the Scoring picker (31 points, 21 points, 21 × 3 cards, a Deuce switch row and a summary line) and the Record games switch (on by default; a read-only On / Off chip once the session has started) with its hint.',
  usage: [
    'Rendered inside SessionSetupForm’s FormProvider only.',
    'Pass recordGamesLocked once the session has started: Record games becomes a read-only On / Off chip with "Record games can\'t change after Start." in the hint.',
    'Mode and Scoring cards show the art in cardArt (image URLs the app serves from apps/queue/public/art/session-setup; Storybook serves the same folder). Scoring stores one of the five keys: 31 + Deuce = 31, 31 without = 31nd, 21 = 21, 21 × 3 + Deuce = 21x3, without = 21x3nd. 21 points has only deuce, so its switch is on and disabled; changing the points card keeps Deuce when the new card has both.',
    'Pass scoringLocked once the session has started: Scoring becomes a read-only box with "Scoring can\'t change after Start.".',
    'Pass an explicit allowedRequestFormats set and callback to show the Players can request pills; defaults and form wiring are supplied by the caller.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 2 (Formats and mode), MODES',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupMinimumSection', 'ChoiceGroup', 'Switch', 'Chip'],
} satisfies ComponentMeta
