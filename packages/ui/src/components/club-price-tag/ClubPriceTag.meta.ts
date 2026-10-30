import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPriceTagMeta = {
  name: 'ClubPriceTag',
  description:
    'A club\'s own monthly license price in the Admin club directory: "₱1,500 /mo", or a Free · tester chip for a free tester club.',
  usage: [
    'monthlyMinor is centavos; the tag shows whole pesos.',
    'Free clubs show the chip instead of a price.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-CLUBS › viewClubs() › td[data-label="Price"]',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  variants: ['paid', 'free'],
  related: ['Chip', 'ClubCell', 'LicenseAccessChip'],
} satisfies ComponentMeta
