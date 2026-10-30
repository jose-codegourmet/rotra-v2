import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPriceFieldsMeta = {
  name: 'ClubPriceFields',
  description:
    "A club's own license price: Paid (monthly and yearly whole pesos) or Free for a tester club, with the twelve-month total and the yearly saving as a hint.",
  usage: [
    'Compose inside a FormProvider whose schema puts clubPriceField (@rotra/schema/club-price) under `price`, as AddClubForm does and the Change price sheet (A-CLUB-PRICE) will.',
    'Switching to Free hides the amounts but keeps what was typed, so switching back to Paid starts from it.',
    'Yearly must be less than 12 × monthly; the message names the twelve-month total.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-ADD-CLUB / A-CLUB-PRICE › priceFields()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md#commercial-model',
  ],
  variants: ['empty', 'paid', 'free', 'missing amounts', 'no discount error'],
  related: ['AddClubForm', 'ClubPriceCard', 'ClubPriceTag', 'ChoiceGroup'],
} satisfies ComponentMeta
