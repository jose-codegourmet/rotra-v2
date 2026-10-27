import type { ComponentMeta } from '@rotra/ui/meta'

export const venuesMeta = {
  name: 'Venues',
  description:
    'Q-VENUES container: useClubVenues in a VenueCard grid, Add venue / Edit in VenueForm saved with useSaveClubVenue, and Create session here → /sessions/new?venueId=.',
  usage: [
    'Rendered by /venues. Duplicate names come back as a field error; other failures toast and keep the sheet open with what was typed.',
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['VenueCard', 'VenueForm', 'PageHeader'],
} satisfies ComponentMeta
