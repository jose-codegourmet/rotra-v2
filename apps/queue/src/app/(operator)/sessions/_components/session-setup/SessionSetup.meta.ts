import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionSetupMeta = {
  name: 'SessionSetup',
  description:
    'Q-SETUP container for /sessions/new and /sessions/[sessionId]/edit: SessionSetupForm with the occurrence and estimate rules from @rotra/data, ChooseDateSheet, VenuePickerSheet + VenueForm (useSaveClubVenue), SessionPeekSheet for clashes, and useCreateQueueSession / useUpdateQueueSession.',
  usage: [
    'Create pre-fills ?date=YYYY-MM-DD and ?venueId=; edit opens only prepared sessions (others redirect to their screen).',
    "Success goes to the preparation page with the mutation's toast; failures toast and keep every value; a clash conflict shows as the form's server error.",
  ],
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'SessionSetupForm',
    'ChooseDateSheet',
    'VenuePickerSheet',
    'VenueForm',
    'SessionPeekSheet',
  ],
} satisfies ComponentMeta
