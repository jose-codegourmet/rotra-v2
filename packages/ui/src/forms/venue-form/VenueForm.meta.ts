import type { ComponentMeta } from '@rotra/ui/meta'

export const venueFormMeta = {
  name: 'VenueForm',
  description:
    'Add or edit a saved venue in a sheet: name, optional address, optional court fee per hour per court and optional entrance fee per head.',
  usage: [
    'mode="new" titles it "New venue", mode="edit" "Edit venue". cancelLabel "Cancel" from the Venues page, "Back" when opened from the venue picker.',
    "Pass existingNames (the club's other venues) to reject duplicates case-insensitively, or the server's message as serverError.",
    'onSubmit receives fees as integer centavos or null (empty never becomes 0) and an empty address as null. Convert saved fees back with feeToInput().',
    'The form never saves: the container owns the mutation, the success toast and the failure message.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Venue sheet › New venue / Edit venue (venue(sh) form mode)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md', 'docs/coding-conventions.md#6-forms'],
  related: ['VenueCard', 'Sheet', 'Field'],
} satisfies ComponentMeta
