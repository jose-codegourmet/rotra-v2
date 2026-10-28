import type { ComponentMeta } from '@rotra/ui/meta'

export const playerTileMeta = {
  name: 'PlayerTile',
  description:
    'A large player tile: picture, name, level, "G/MIN games" and a status line ("Playing · Court X", "Not present", "Resting M min", or a note such as "Already in this match" / "Team A"). The pressed tile is the current choice.',
  usage: [
    'Use in the Q-PICK-PLAYER grid (PlayerPickerSheet) and in the Q-SUBSTITUTE "Who\'s coming off?" / "Replacement" grids.',
    'Pass status { kind: "note" } to replace the live status with a reason: players already in another slot are disabled with "Already in this match"; substitution shows the player\'s team.',
    'Never colour alone: busy, fresh and away each change the status text as well as its colour.',
    'For the Players view use PlayerPoolCard; for a picture on a court or queue card use PlayerFaceButton.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'playerTile() (.ptile) in pickerSheet() and the substitute sheet',
  },
  docs: ['docs/screens/product/modules/queue/match-queue.md#q-pick-player--choose-a-slots-player'],
  variants: ['busy', 'away', 'fresh', 'note'],
  related: ['PlayerPickerSheet', 'PlayerPoolCard', 'PlayerFaceButton', 'Avatar'],
} satisfies ComponentMeta
