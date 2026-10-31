import type { ComponentMeta } from '@rotra/ui/meta'
export const contactChangeRequestFormMeta = {
  name: 'ContactChangeRequestForm',
  description:
    "The 'Request a contact change' sheet: choose Phone number or Email, see the current value, type the new one, with the Admin-approval notice.",
  usage: [
    'Open from P-PHONE-PRIVACY or P-EDIT-PROFILE only when no request is open. The container submits and shows the toast.',
    'Never add a document upload or identity-proof field.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'SHEETS.request, ACT.submitRequest',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  related: ['ContactDetailsCard', 'ContactRequestStatus'],
} satisfies ComponentMeta
