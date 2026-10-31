import type { ComponentMeta } from '@rotra/ui/meta'

export const publishResultsFormMeta = {
  name: 'PublishResultsForm',
  description:
    'The Publish results sheet (Q-PUBLISH, D-PUBLISH): audience "anyone with the session link", the Standings and Awards choices, the explicit Include Off Day opt-in with the names it would show (D-OFF-DAY), the ranks note, the offline notice, Back to private review and the primary Publish selected results.',
  usage: [
    'Open it from Publish results / Update publication on ResultsHeader or the session record. Pass defaultValues = publishResultsFormDefaultValues(previousPublication): Standings and Awards both on the first time, the previous selection when updating. Include Off Day is forced off on every mount, whatever is passed.',
    'offDayNames are the players the Off Day slide would show publicly ("Shows A, B and C publicly." or "Empty for this session."); standingsCount and hasMostImproved fill the Standings and Awards descriptions.',
    'Publish selected results is disabled when nothing is chosen, offline (online false also shows "Publishing needs internet.") or pending. onSubmit receives { standings, awards, includeOffDay }; the container owns the usePublishResults mutation, the "Results published to the session page" toast and serverError. Publishing again replaces the previous selection; the form never mutates.',
    'Withdrawing a publication entirely is an open decision and is not offered here.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.publish (ACT.openPublish, ACT.confirmPublish)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-publish--publish-results',
    'docs/screens/product/dialogs.md#d-publish--public-result-selection',
    'docs/screens/product/dialogs.md#d-off-day--explicit-sharing-inclusion',
    'docs/business_logic/product/queue/modules/results/README.md#publishing',
    'docs/coding-conventions.md#6-forms',
  ],
  related: ['ResultsHeader', 'ExportImagesSheet', 'Checkbox', 'Notice', 'Sheet'],
} satisfies ComponentMeta
