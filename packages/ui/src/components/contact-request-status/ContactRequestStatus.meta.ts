import type { ComponentMeta } from '@rotra/ui/meta'
export const contactRequestStatusMeta = {
  name: 'ContactRequestStatus',
  description:
    "The contact-change request's status: Waiting for review, Approved · being applied, Applied, Needs attention or Not approved, by chip and text.",
  usage: [
    "Full on P-PHONE-PRIVACY under Contact details; compact in AccountPanel's requestSlot while a request is open.",
    "Only for the request's owner: it shows their current and new phone or email.",
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'Privacy and contact (requestCard, REQ), privatePanel() request chip',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['full', 'compact'],
  related: ['ContactDetailsCard', 'AccountPanel'],
} satisfies ComponentMeta
