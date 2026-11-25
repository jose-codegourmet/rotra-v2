import type { ComponentMeta } from '@rotra/ui/meta'

export const standingsSlideMeta = {
  name: 'StandingsSlide',
  description:
    'Slide 1 of the session results: the #, Player, W, L, G standings table inside the result slide frame, one row per position (a shared position stacks its faces, at most four then "+N", and lists its names "A & B" or "A, B, C"; G shows a range when counted games differ), or "No counted games were recorded in this session."',
  usage: [
    'Use for the Standings tab of the private results view, on the public session page when Standings are published, and as each downloaded standings image (ExportImagesSheet previews it scaled down).',
    'Rows arrive ordered from the standings maths (Q08.4), players with the same wins and losses sharing a position; the slide groups consecutive rows that share a position and never sorts. Pass pictureUrl per row for faces (initials without it).',
    'For one of several downloaded images pass page { n, of }: the title reads "Standings · 2 of 3".',
    "On the signed-in public page pass highlightRowId (matching a row id) to mark the viewer's own row with an accent-subtle background.",
    'Use LiveLeaderboard for the in-session table with levels and the minimum-games meter, not this.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-STANDINGS-SLIDE › slideStandings() (.slide, .st-table)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/mockup-changes/2026-11-25-queue-standings-image-shared-rows.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: ['ResultSlideFrame', 'StandingsFaces', 'AwardsSlide', 'OffDaySlide', 'LiveLeaderboard'],
} satisfies ComponentMeta
