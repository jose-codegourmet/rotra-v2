import type { ComponentMeta } from '@rotra/ui/meta'

export const resultsHeaderMeta = {
  name: 'ResultsHeader',
  description:
    'Head of the private result review (Q-RESULTS): "Session results · private", the session title, date · venue · N games, the actions Match history, View public page, Download images and the primary Publish results / Update publication, then the three status chips and the read-only note.',
  usage: [
    'Use at the top of the results view after Session done or from Result slides on a session record. Pass the date already formatted (formatShortDate) and the counted game count.',
    'published switches the primary action to "Update publication" and the chip to "Club results published"; offDayShared (only meaningful when published) switches the warn chip to "Off Day shared". The three statuses are separate on purpose: player records and ranks update at finalization, publishing is a later optional club action.',
    'Results are read-only. This header never edits standings, awards or Off Day; it only opens the Publish results sheet (PublishResultsForm) and the Download images sheet (ExportImagesSheet) through its callbacks.',
    'Not for the session record: use SessionRecordHeader there ("Session record · read-only").',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'viewResults() › header, actions and chips',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-results--private-result-review',
    'docs/business_logic/product/queue/modules/results/README.md#finalization-versus-publishing',
  ],
  related: ['PublishResultsForm', 'ExportImagesSheet', 'SessionRecordHeader', 'PageHeader', 'Chip'],
} satisfies ComponentMeta
