import type { ComponentMeta } from '@rotra/ui/meta'

export const publicResultsSectionMeta = {
  name: 'PublicResultsSection',
  description:
    'The Results section of the public session page: the published Standings and/or Awards slides, Off Day only when explicitly included (public variant, no private band), or "Results for this session have not been shared." before publication.',
  usage: [
    'Use at the bottom of the public session page for finished (finalized) sessions, and in the operator preview of that page.',
    'Pass only what the publication contains; the component renders exactly the slides it is given and cannot draw the private Off Day band.',
    'Do not use for invalid sessions (they have no results section) or for the private result review, which uses the slides directly with ResultsHeader.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen:
      'Q-PUBLIC-RESULTS › viewPublic() results section (section.stack h2 Results · .card.empty)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: ['StandingsSlide', 'AwardsSlide', 'OffDaySlide', 'PublicPageSummary'],
} satisfies ComponentMeta
