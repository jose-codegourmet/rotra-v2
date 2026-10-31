import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPriceCardMeta = {
  name: 'ClubPriceCard',
  description:
    "Club detail License tab: the club's own monthly and yearly license price with the yearly saving, or Free for a tester club, and Change price.",
  usage: [
    'Prices are centavos and show as whole pesos in mono. yearlySavingPercent is worked out upstream (prototype savePct()); 0 or less reads "No yearly discount".',
    'Change price renders only when onChangePrice is passed; it opens the price sheet (A-CLUB-PRICE).',
    'Changing the price never changes payments already recorded.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › License › panels.license (Price card)',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  variants: ['paid', 'paid without yearly discount', 'free'],
  related: ['ValueTiles', 'ClubPriceTag', 'LicenseStatusCard', 'Card'],
} satisfies ComponentMeta
