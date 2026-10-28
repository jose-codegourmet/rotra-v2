import type { ComponentMeta } from '@rotra/ui/meta'

export const publicPageSummaryMeta = {
  name: 'PublicPageSummary',
  description:
    'The session record\'s Public page tab: what anyone with the session link sees. Details, "Results on the page" (shared slides, Off Day shared or private, publish time; "Not shared yet"; or the invalid copy), Open public page and Publish results / Update publication, then the Participants grid.',
  usage: [
    'Use as the body of the Public page tab of a session record (Q-HISTORY). Pass the participant cards (ParticipantCard from PublicParticipants) as children; the component lays them out in the grid.',
    'Invalid sessions get the "Invalid sessions have no results to share." copy and no publish action.',
    'Do not use on the public page itself: that page is built from PublicSessionHero, PublicSessionDetails, PublicParticipants and PublicResultsSection.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histPublicPane() (.between, .grid2 .card.stack, .pgrid)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/results/README.md',
  ],
  related: [
    'SessionRecordHeader',
    'PublicResultsSection',
    'PublicParticipants',
    'KeyValueList',
    'PublishResultsForm',
  ],
} satisfies ComponentMeta
