import type { ComponentMeta } from '@rotra/ui/meta'

export const playerFaceButtonMeta = {
  name: 'PlayerFaceButton',
  description:
    'A player’s picture with their short name (nickname or first name) under it; tapping it opens the profile. Used on court drawings and queue cards.',
  usage: [
    'Use inside CourtDrawing (each team’s side of the net) and on queue cards. Pass the full accessible label, e.g. "Mikee Abellana, Team A. View profile".',
    'Courts pass size 34, 28 or 24 by team size; queue cards pass size "queue" (28, 40 on touch).',
    'The optional swap props are for switching sides (Queue › Match queue): inside a SwappablePlayer pass team and index only, so the wrapper owns the arrow keys; leave them out on courts.',
    'Do not use for a player row with a level and presence; use RosterRow or SavedPlayerCard.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtSides() (.pf) and queue cards (.qf)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  related: ['Avatar', 'CourtDrawing', 'CourtCard'],
} satisfies ComponentMeta
