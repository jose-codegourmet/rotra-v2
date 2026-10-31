import type { ComponentMeta } from '@rotra/ui/meta'

export const venueCardMeta = {
  name: 'VenueCard',
  description:
    'One saved venue on the Venues page: name, address, court and entrance fees, sessions held there, the next booked session, and Create session here / Edit.',
  usage: [
    'Fees are integer centavos and show "—" when unset; they are estimates only, never shown publicly.',
    'Lay cards out in a grid of repeat(auto-fill, minmax(min(100%, 280px), 1fr)) as the prototype does.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-VENUES › viewVenues() (.venue-card)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['VenueForm'],
} satisfies ComponentMeta
