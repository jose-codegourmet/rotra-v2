import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPoolCardMeta = {
  name: 'PlayerPoolCard',
  description:
    'One player in the live Players view: the picture in a level-band ring (no level text), one name (club nickname, nickname, full name; two lines at most), the Current | Total games strip, "M min wait" when available, status (On Court X, Away, Queued · #P, Free) and the Present switch. Tapping the card picks the player for the next match and shows the pick order.',
  usage: [
    'Pass onNoShow only on the live Players view for a player who is away, has played no games and is in no match: "No show (cancelled)" opens the Mark NAME as No show? confirmation.',
    'There is no Move to waitlist on the live card: the session is already running (2026-11-19-queue-live-no-move-to-waitlist).',
    'Pass name as the full name, plus nickname and clubNickname when present: the card shows one name (club nickname, nickname, full name) and keeps the full name as hover text and screen-reader label.',
    'The level shows only as the picture ring (grey with no level); hovering the picture names the level.',
    'Pass forTheNight as played plus queued games, and selfCheckedInAt or leftAt for the presence caption.',
    'presencePending shows Saving presence… without disabling the switch; the data batch owns optimistic values and rollback.',
    'Use in the Q-POOL grid of the live console (Players tab). The whole card is a toggle button with aria-pressed; Enter and Space select it too.',
    'The Present switch is a separate control: toggling it never changes the selection, and turning someone off never ends their current game.',
    'Pass waitMinutes only for available players (present and off court); playing and away cards show no wait.',
    'For the preparation roster use RosterRow; for saved players use SavedPlayerCard.',
    'Pass onSetGames to make Current in the games strip a button (dashed underline, hover tint, focus ring) that opens Set games played (D-SET-GAMES); it never selects the card. Total is not clickable. games is the adjusted count from gamesPlayed() in the match rules.',
    'Pass onOpenProfile to make the picture a button (“View NAME’s profile”) that opens the player profile card (D-PARTICIPANT-PROFILE); the card itself still selects the player for a match.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.pc3)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/business_logic/product/queue/modules/players/README.md#presence',
  ],
  variants: [
    'available',
    'playing',
    'away',
    'level rings',
    'club nickname',
    'with Set games played',
    'with profile button',
  ],
  related: ['PlayerPoolToolbar', 'SelectionBar', 'SetGamesSheet', 'RosterRow', 'PlayerNameBlock', 'Switch', 'Avatar'],
} satisfies ComponentMeta
