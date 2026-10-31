import type { ComponentMeta } from '@rotra/ui/meta'

export const licensePanelMeta = {
  name: 'LicensePanel',
  description:
    'Club settings › License and payments: status chip, Plan / Active since / Active until / Days left tiles, the renewal copy, and the payment history table with Export CSV.',
  usage: [
    'One page for License and Payment history (the left menu has one item for both). The container feeds useClubLicense and useLicensePayments and builds the CSV with licensePaymentsCsv.',
    'Pass sampleAmounts while license prices are placeholders; the note disappears once they are decided.',
    'Never shows prices or a checkout: licenses are activated by the platform owner outside ROTRA.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › viewClub() #club-license and #club-payments',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['DataTable', 'Chip', 'ClubSettingsMenu'],
} satisfies ComponentMeta
