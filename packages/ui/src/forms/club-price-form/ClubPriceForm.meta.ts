import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPriceFormMeta = {
  name: 'ClubPriceForm',
  description:
    "A-CLUB-PRICE: change a club's own license price to Paid (monthly and yearly whole pesos) or Free for a tester club. The new price only fills in licenses recorded from now on.",
  usage: [
    'Render it as the body of the "Price for {club}" sheet, opened by Change price on the club\'s License tab. The Cancel and Save price buttons are part of it; put it in a Sheet without a footer.',
    'Pass currentPriceLine from clubPriceLine() and defaultValues from clubPriceInputFrom() (@rotra/ui/forms/club-price-fields/helpers); a free club keeps its last paid amounts, so switching to Paid starts from them.',
    'Validation is clubPriceField (@rotra/schema/club-price), the same as Add club. The container owns the mutation, the toast and closing the sheet.',
    'While isPending, Save price reads "Saving…" and nothing can be pressed; serverError shows above the buttons and the typed values stay.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-CLUB-PRICE › SHEETS.price',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md#a-club-price--change-a-clubs-price',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md#commercial-model',
  ],
  variants: ['paid', 'free', 'errors', 'pending', 'server error'],
  related: ['ClubPriceFields', 'ClubPriceCard', 'Sheet'],
} satisfies ComponentMeta
