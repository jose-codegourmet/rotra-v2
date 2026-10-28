import type { ComponentMeta } from '@rotra/ui/meta'

export const recordPublicTabMeta = {
  name: 'RecordPublicTab',
  description:
    'Public page tab of the session record (Q-HISTORY): PublicPageSummary from useSessionRecord (the record prop), useSessionPublication and usePublicSession, with a ParticipantCard per participant.',
  usage: [
    'Rendered inside SessionRecord\'s "Public page" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components. Renders nothing until the public projection and the publication have loaded.',
    'Details (when, venue, courts, formats, mode, minimum) and the participants are what the session link shows, from the public projection. "Results on the page" lists the shared slides, Off Day Shared / Private and the publish time, or "Not shared yet".',
    'Open public page → the operator preview /sessions/[sessionId]/public-page. Publish results / Update publication opens PublishResultsSheet; the card updates after a publish. Invalid sessions show "Invalid sessions have no results to share." and no Publish button.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/business_logic/product/queue/modules/results/README.md#publishing',
  ],
  related: ['SessionRecord', 'PublicPageSummary', 'ParticipantCard', 'PublishResultsSheet'],
} satisfies ComponentMeta
