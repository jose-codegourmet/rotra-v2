import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPriceSheetMeta = {
  name: 'ClubPriceSheet',
  description:
    'A-CLUB-PRICE container: a Sheet titled "Price for {club}" with ClubPriceForm, starting from the stored price, and Save price over useChangeClubPrice.',
  usage: [
    'Mounted by ClubDetail; Change price on the License tab (ClubPriceCard onChangePrice) opens it. Pass club, open and onOpenChange.',
    'ClubPriceForm renders its own Cancel and Save price buttons, so the Sheet has no footer. A free club starts from its last paid amounts (clubPriceInputFrom).',
    'Unchanged values close the sheet without saving. Success closes and toasts "Price saved: {price line}."; failure stays open with serverError and an error toast.',
    'A new price applies to licenses recorded from now on; recorded payments keep their amounts.',
    'While saving the sheet has no close button and ignores Escape and the scrim. A ref keeps repeated taps to one request.',
    'Offline (useAdminConnectivity), Save price sends nothing and shows ADMIN_OFFLINE_ERROR in the form, keeping the typed price (an unchanged price still just closes).',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'SHEETS.price; ACT.openPrice / doPrice',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: ['Sheet', 'ClubPriceForm', 'ClubPriceFields', 'Toaster'],
} satisfies ComponentMeta
