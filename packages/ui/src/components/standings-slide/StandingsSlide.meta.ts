import type { ComponentMeta } from '@rotra/ui/meta'

export const standingsSlideMeta = {
  name: 'StandingsSlide',
  description:
    'Slide 1 of the session results: the #, Player, W, L, G standings table inside the result slide frame, or "No counted games were recorded in this session."',
  usage: [
    'Use for the Standings tab of the private results view, on the public session page when Standings are published, and as the reference for standings image frames.',
    'Rows arrive ordered with unique positions from the standings maths (Q08.4); the slide computes nothing and never sorts.',
    'Use LiveLeaderboard for the in-session table with levels and the minimum-games meter, not this.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-STANDINGS-SLIDE › slideStandings() (.slide, .st-table)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: ['ResultSlideFrame', 'AwardsSlide', 'OffDaySlide', 'LiveLeaderboard'],
} satisfies ComponentMeta
