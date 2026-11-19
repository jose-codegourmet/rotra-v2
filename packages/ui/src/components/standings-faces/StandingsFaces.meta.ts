import type { ComponentMeta } from '@rotra/ui/meta'

export const standingsFacesMeta = {
  name: 'StandingsFaces',
  description:
    'The Player cell of a standings row: one face beside the name, or the overlapping faces of a shared position (the first on top) over every name. Also formats the games count or range.',
  usage: [
    'Used by LiveLeaderboard and SessionStandings. Pass one face per player in the order the names show; each face with onOpen is its own profile button, a face without it is plain (masked or private players).',
    'A shared position stacks faces with a 2 px surface ring and a 10 px overlap; hover or focus lifts a face above its neighbours. Six players sharing use the same stack; it wraps onto a second line when the cell is narrow.',
    'Names sit on their own lines under the faces, joined by commas, and wrap anywhere so a long name never pushes into the W / L / Games columns.',
    'formatStandingsGames turns a number or {min, max} into "5" or "5–6".',
    'Not used on the share images: they stay one row per player (open decision).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Shared styles › .lb-stack, .lb-p.tied, .lb-who.tied; boardPane(), histResultsPane(), pubLeaderboard()',
  },
  docs: [
    'docs/mockup-changes/2026-11-18-queue-shared-standings-positions.md',
    'docs/business_logic/product/queue/modules/results/README.md#session-standings',
  ],
  related: ['Avatar', 'LiveLeaderboard', 'SessionStandings'],
} satisfies ComponentMeta
