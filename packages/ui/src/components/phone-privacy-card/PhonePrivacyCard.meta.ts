import type { ComponentMeta } from '@rotra/ui/meta'
export const phonePrivacyCardMeta = {
  name: 'PhonePrivacyCard',
  description:
    "The 'Phone privacy' card: the Hide my phone number from clubs switch, a separate saved-state line, and an error notice.",
  usage: [
    'Use on P-PHONE-PRIVACY. Pass the saved value, never an optimistic one; the switch is disabled while saving.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'Privacy and contact (viewAccount)',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/player-information/modules/identity/README.md',
  ],
  related: ['ContactDetailsCard', 'SignOutCard'],
} satisfies ComponentMeta
