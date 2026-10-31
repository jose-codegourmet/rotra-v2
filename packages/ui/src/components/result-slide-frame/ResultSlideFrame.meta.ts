import type { ComponentMeta } from '@rotra/ui/meta'

export const resultSlideFrameMeta = {
  name: 'ResultSlideFrame',
  description:
    'The frame every session result slide shares: club logo or initials and name, the slide title, "session title · date", the slide content, and a footer with the venue and "powered by rotra".',
  usage: [
    'Wrap StandingsSlide, AwardsSlide and OffDaySlide content with it; do not build other cards with it.',
    'Used in the private results view, on the public session page (published slides only) and as the visual reference for image exports.',
    'Read-only: no selection, edit or reorder controls. The footer string is always exactly "powered by rotra".',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-RESULTS › slideFrame() (.slide, .sh, .foot)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: ['StandingsSlide', 'AwardsSlide', 'OffDaySlide', 'Avatar', 'ClubHeader'],
} satisfies ComponentMeta
