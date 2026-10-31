import type { ComponentMeta } from '@rotra/ui/meta'

export const awardsSlideMeta = {
  name: 'AwardsSlide',
  description:
    'Slide 2 of the session results: MVP and Most Improved cards inside the result slide frame, each with its reason line or the copy for when no one qualifies, plus the "Prototype formula" footnote.',
  usage: [
    'Use for the Awards tab of the private results view, on the public session page when Awards are published, and as the reference for the awards image frame.',
    'Pass mvp or mostImproved as null when the award maths (Q08.4) names no one; never fill an award with the best available player.',
    'showFormulaNote stays true until the award maths is decided (business open decision).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-AWARDS-SLIDE › slideAwards() (.slide, .award)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: ['ResultSlideFrame', 'StandingsSlide', 'OffDaySlide'],
} satisfies ComponentMeta
