import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionTitleLinkMeta = {
  name: 'SessionTitleLink',
  description:
    'The session title in a Queue page header as a link that opens the session’s public page in a new tab, with a small external-link icon.',
  usage: [
    'Pass it as the title of PageHeader, or set `titleHref` on SessionRecordHeader and ResultsHeader.',
    'The href is the club preview `/sessions/<id>/public-page`, never the visitor link.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Preparation, live session, session record and session results headers (sessTitle)',
  },
  docs: ['docs/mockup-changes/2026-11-13-queue-session-title-link.md'],
  related: ['PageHeader', 'SessionRecordHeader', 'ResultsHeader'],
} satisfies ComponentMeta
