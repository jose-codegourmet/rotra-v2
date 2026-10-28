import type { ComponentMeta } from '@rotra/ui/meta'

export const publishResultsSheetMeta = {
  name: 'PublishResultsSheet',
  description:
    'Q-PUBLISH container: PublishResultsForm (its own Foundation Sheet) over useSessionResults and useSessionPublication, published with usePublishResults.',
  usage: [
    'Mounted by SessionResults (Publish results / Update publication) and by the session record Public page tab, both passing { sessionId, open, onOpenChange }. Renders nothing until the snapshot and the publication have loaded.',
    'The form remounts on every open: Standings and Awards start from the previous publication (both on the first time) and Include Off Day always starts unchecked, so sharing Off Day once never carries over (D-OFF-DAY).',
    'Online only: offline (DevMenu Simulate offline) the form shows "Publishing needs internet." and disables Publish selected results.',
    'Success closes the sheet and toasts "Results published to the session page"; usePublishResults refreshes the publication, the record and the session. A failure (DevMenu next save fails) keeps the sheet open with the reason as serverError and the selection as chosen, toasts the error, and leaves the previous publication and the "Player records and ranks updated" chip untouched.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-publish--publish-results',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/results/README.md#publishing',
  ],
  related: ['PublishResultsForm', 'SessionResults', 'RecordPublicTab'],
} satisfies ComponentMeta
