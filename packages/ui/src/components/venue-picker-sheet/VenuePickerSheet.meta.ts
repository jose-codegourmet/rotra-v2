import type { ComponentMeta } from '@rotra/ui/meta'

export const venuePickerSheetMeta = {
  name: 'VenuePickerSheet',
  description:
    'Session setup › Choose a venue: search by name or area, pick a saved venue (with its fees line), Edit per venue, and "+ Add “NAME” as a new venue" / "+ Add a new venue".',
  usage: [
    'The container opens VenueForm (cancelLabel "Back") for onEdit / onAddNew and selects the saved venue afterwards.',
    'Picking fills the venue and address in SessionSetupForm; fees reach the cost estimate in Queue › Financials.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › SHEETS.venue (pick mode)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['VenueForm', 'SessionSetupForm', 'Sheet'],
} satisfies ComponentMeta
