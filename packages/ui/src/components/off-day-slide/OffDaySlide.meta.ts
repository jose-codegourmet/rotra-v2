import type { ComponentMeta } from '@rotra/ui/meta'

export const offDaySlideMeta = {
  name: 'OffDaySlide',
  description:
    'Slide 3 of the session results: the eligible below-baseline players inside the result slide frame, with the "Private · not included in sharing" band in the private variant and the five-session footnote.',
  usage: [
    'Use the private variant (default) in the private results view. Use the public variant only on the public session page or in an export after the Queue Master explicitly included Off Day.',
    'Rows come from the award maths (Q08.4). Never list the weakest player just to fill the slide; pass an empty list instead.',
    'Off Day is a session observation, not a profile label: never show it on a player profile.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-OFF-DAY-SLIDE › slideOffDay() (.slide, .private-band, .award)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  variants: ['private', 'public'],
  related: ['ResultSlideFrame', 'StandingsSlide', 'AwardsSlide'],
} satisfies ComponentMeta
