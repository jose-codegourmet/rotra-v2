import type { ComponentMeta } from '@rotra/ui/meta'
export const contactDetailsCardMeta = {
  name: 'ContactDetailsCard',
  description:
    "The 'Contact details' card: the owner's login phone and email, the request status, and Request a change.",
  usage: [
    'Use on P-PHONE-PRIVACY only, for the signed-in owner. Pass ContactRequestStatus into statusSlot.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'Privacy and contact (viewAccount)' },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  related: ['ContactRequestStatus', 'PhonePrivacyCard'],
} satisfies ComponentMeta
