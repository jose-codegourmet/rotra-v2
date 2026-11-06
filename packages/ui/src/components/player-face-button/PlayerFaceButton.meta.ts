import type { ComponentMeta } from '@rotra/ui/meta'

export const playerFaceButtonMeta = {
  name: 'PlayerFaceButton',
  description:
    'A player’s picture with their short name (nickname or first name) under it; tapping it opens the profile. Used on court drawings and queue cards.',
  usage: [
    'Use inside CourtDrawing (each team’s side of the net) and on queue cards. Pass the full accessible label, e.g. "Mikee Abellana, Team A. View profile".',
    'Courts pass size 34, 28 or 24 by team size; queue cards pass size "queue" (44, 46 on touch) with 15 px semibold names. History rows keep their own small faces and 12 px names — they do not use size "queue".',
    'On a live queue card, pass wait so "M min" (plain under 10, warning 10–15, error 16+) or On court / Playing / Not here sits under the name. The accessible name adds "waiting M min" when the timer is shown.',
    'The optional swap props are for switching sides (Queue › Match queue): inside a SwappablePlayer pass team and index only, so the wrapper owns the arrow keys; leave them out on courts.',
    'Do not use for a player row with a level and presence; use RosterRow or SavedPlayerCard.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtSides() (.pf) and queue cards (.qf)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/screens/product/modules/queue/match-queue.md',
  ],
  related: ['Avatar', 'CourtDrawing', 'CourtCard', 'MatchCard'],
} satisfies ComponentMeta
