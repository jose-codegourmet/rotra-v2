import type { ComponentMeta } from '@rotra/ui/meta'

export const matchCardMeta = {
  name: 'MatchCard',
  description:
    'One waiting match in the shared queue: queue position, format, origin, flow arrow and drag handle; Team A, VS, Team B (44 px faces, 15 px names, optional per-name wait); a status line (ready, needs attention, blocked, waiting for courts) that is always icon + text; Start, Edit and Remove.',
  usage: [
    'Search highlights matching players and dims other cards without modifying the queue.',
    'readOnly removes the drag handle, operator metadata, profile buttons and actions for a signed-in Player on a public session page.',
    "Use for every waiting match in the Queue tab grid and in the Session view's upcoming row.",
    'Do not use for finished matches; the session record has its own row component in Queue › Results.',
    'Start renders only with onStart and is enabled only when the status is ready, or with canOpenCourt while the match only waits for a court and a court is not open yet (the Start match sheet then offers Start anyway). Edit and Remove render only with their callbacks.',
    'The grid passes the flow arrow and the reorder behaviour passes handleProps; the card itself does not reorder.',
    'With swappable inside a SwapSidesArea, each player can be dragged onto the other team or moved across with the arrow keys; the area reports the swap.',
    'Each player may carry wait (minutes, On court, Playing, Not here); the console supplies it. History rows are MatchRecordCard, not this tile.',
    'With draft, the same tile is an Auto Queue draft: a Draft chip replaces #position, no handle or actions, faces with the level ring and games badge only (no chips under the names), and the whole tile toggles selection (role="button", aria-pressed, Space / Enter) with a pick-order badge. Tapping the games badge opens the games and does not pick the draft; a busy player is explained in the status line.',
    'Each face is the 3 px level ring (Beginner, Intermediate, Advanced; grey with no level) with a games badge on its top right (player.games). With onOpenGames the badge is its own button next to the face button, named "NAME\'s games this session, N"; the face still opens the profile. gamesBadge="static" keeps it display only, for faces inside other dialogs.',
    'Ready: full accent border, accent tint, accent glow and a solid "Ready for court" pill on the top edge. Waiting cards stay plain. Needs attention has no coloured border and keeps only its warning status line (icon and text); draft tiles keep their warn border.',
    'variant="compact" (Courts tab › Upcoming queued matches, 300 px tiles): no wait times and no games badge; each team is an overlapping stack of 34 px pictures with level rings and the short names on one line ("Rafa, Migo, Pau"), then VS and the other team. Head, status line, buttons and Ready for court stay; a picture opens the profile and, with swappable, drags onto the other team.',
    'categoryPrefix puts the match category in front of the format label ("Mixed" gives "Mixed Doubles", "Genderless" gives "Genderless 3v3 fun"); the value comes from the mock data.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-QUEUE › queueCard() (.qtile, .qt-head, .qfaces, .status-line)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['ready', 'needs-attention', 'blocked', 'waiting-for-courts'],
  related: [
    'QueueGrid',
    'UpcomingQueueRow',
    'SwapSidesArea',
    'SwappablePlayer',
    'PlayerFaceButton',
    'CourtCard',
    'Chip',
  ],
} satisfies ComponentMeta
