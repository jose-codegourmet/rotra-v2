import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPoolCardMeta = {
  name: 'PlayerPoolCard',
  description:
    'One player in the live Players view: picture, name, locked level, "G/MIN games", "M min wait" when available, status (On Court X, Away, Queued · #P, Free) and the Present switch. Tapping the card picks the player for the next match and shows the pick order.',
  usage: [
    'Use in the Q-POOL grid of the live console (Players tab). The whole card is a toggle button with aria-pressed; Enter and Space select it too.',
    'The Present switch is a separate control: toggling it never changes the selection, and turning someone off never ends their current game.',
    'Pass waitMinutes only for available players (present and off court); playing and away cards show no wait.',
    'For the preparation roster use RosterRow; for saved players use SavedPlayerCard.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.pc3)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/business_logic/product/queue/modules/players/README.md#presence',
  ],
  variants: ['available', 'playing', 'away'],
  related: ['PlayerPoolToolbar', 'SelectionBar', 'RosterRow', 'Switch', 'Avatar'],
} satisfies ComponentMeta
