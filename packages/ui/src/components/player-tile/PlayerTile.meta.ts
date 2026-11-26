import type { ComponentMeta } from '@rotra/ui/meta'

export const playerTileMeta = {
  name: 'PlayerTile',
  description:
    'A large player tile: the picture with the level ring and the games badge (no level text, no "N/M"), the name stack (club nickname, nickname, full name: the first present on top, the others in smaller lines) and a status line ("Resting N min", "On court · Court X", "Playing · Court X", "Not present", or a note such as "Already in this match" / "Team A"). The accessible name keeps "NAME, LEVEL, N of M games, STATUS". The pressed tile is the current choice.',
  usage: [
    'Use in the Q-PICK-PLAYER grid (PlayerPickerSheet) and in the Q-SUBSTITUTE "Who\'s coming off?" / "Replacement" grids.',
    'Pass status { kind: "note" } to replace the live status with a reason: players already in another slot are disabled with "Already in this match"; substitution shows the player\'s team.',
    'Pass name as the full name, plus nickname and clubNickname when present (Queue Master screens only; the public Request a match picker never gets a club nickname). status { kind: "playing", gettingReady: true } reads "On court · Court X".',
    'Never colour alone: busy, fresh and away each change the status text as well as its colour.',
    'For the Players view use PlayerPoolCard; for a picture on a court or queue card use PlayerFaceButton.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'playerTile() (.ptile.pt-ring, .pf-g, .pt-sub) in pickerSheet() and the substitute sheet',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-pick-player--choose-a-slots-player',
    'docs/mockup-changes/2026-11-26-queue-name-hierarchy.md',
  ],
  variants: ['busy', 'away', 'fresh', 'note'],
  related: ['PlayerPickerSheet', 'PlayerPoolCard', 'PlayerFaceButton', 'Avatar'],
} satisfies ComponentMeta
