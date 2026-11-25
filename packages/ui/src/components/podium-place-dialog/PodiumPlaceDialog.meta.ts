import type { ComponentMeta } from '@rotra/ui/meta'

export const podiumPlaceDialogMeta = {
  name: 'PodiumPlaceDialog',
  description:
    'Everyone who shares one podium place: title "1st place · 4 players", a muted line, one row per player (picture, full name, nickname or club, chips, record) and Close.',
  usage: [
    'Open from TopThreePodium onOpenPlace for a shared place.',
    'Pass the muted line as description: "Same wins and win rate: 7 wins and 88% each this week." or "Same wins and losses: 2 W and 1 L each."',
    'statLayout stacked (ROTRA Player: wins over win rate) or inline (Queue: W · L · games · win rate).',
    'onOpenPlayer makes rows open the profile; omit it for plain rows, or set canOpen false on one row.',
    'With no players it reads "No one is in this place now."',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PODIUM-PLACE › SHEETS.podiumPlace (also rotra-player.html lbPlaceSheet)',
  },
  docs: [
    'docs/screens/product/modules/queue/leaderboards.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
  ],
  variants: ['stacked', 'inline'],
  related: ['TopThreePodium', 'Sheet', 'Chip'],
} satisfies ComponentMeta
