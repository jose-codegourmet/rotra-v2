import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPoolCardMeta = {
  name: 'PlayerPoolCard',
  description:
    'One player in the live Players view: the picture in a level-band ring (no level text), one name (club nickname, nickname, full name; two lines at most), the Current | Total games strip, the footer (status pill icon and time, then the Present switch). The Edit player pencil is a 28 px accent circle on the card's top-right corner. Tapping the card picks the player for the next match and shows the pick order.',
  usage: [
    'handicapSpots (D-2026-11-25-03): any marked spot shows a small warning icon after the name; title and accessible name "Handicap: left knee, lower back" (handicapText).',
    'The status is a StatusPill (owner, November 25, 2026, docs/mockup-changes/2026-11-25-queue-status-pills.md): hourglass Nm (free), list Nm (queued; waitMinutes), shuttlecock Nm (status.minutes since the match began; hover names the court), clock Ready (status.minutes null) or moon Away (owner, November 26, 2026, docs/mockup-changes/2026-11-26-queue-player-status-icons.md). The queue position no longer shows on the card.',
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
    'Pass onEdit to show the Edit player pencil (“Edit NAME”) as a 28 px accent circle on the top-right corner, over the border; the name row keeps the full width. A selected card shows the pick badge on the left corner and the pencil on the right. Pressing it never selects the card.',
    'Pass onOpenProfile to make the picture a button (“View NAME’s profile”) that opens the player profile card (D-PARTICIPANT-PROFILE); the card itself still selects the player for a match.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.pc3)',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-handicap-tonight.md',
    'docs/mockup-changes/2026-11-26-queue-player-status-icons.md',
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
    'with Edit player corner pencil',
  ],
  related: [
    'PlayerPoolToolbar',
    'StatusPill',
    'SelectionBar',
    'SetGamesSheet',
    'RosterRow',
    'PlayerNameBlock',
    'Switch',
    'Avatar',
  ],
} satisfies ComponentMeta
