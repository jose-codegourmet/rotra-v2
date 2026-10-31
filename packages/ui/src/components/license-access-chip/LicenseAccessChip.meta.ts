import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseAccessChipMeta = {
  name: 'LicenseAccessChip',
  description:
    "A club's license access state in the Admin club directory and club detail: Active, Ends in N days, Ends today, Expired, Starts {date} or No license yet.",
  usage: [
    'Pass the computed ClubAccessState; the chip formats text and tone only and does no date math.',
    'Active ending within 7 days and a scheduled first term are warn; Expired is error.',
    'Always carries its text; colour only reinforces it.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUBS › viewClubs() › accessChip()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  variants: ['active', 'ends-soon', 'ends-today', 'expired', 'scheduled', 'none'],
  related: ['Chip', 'ClubCell', 'ClubPriceTag'],
} satisfies ComponentMeta
