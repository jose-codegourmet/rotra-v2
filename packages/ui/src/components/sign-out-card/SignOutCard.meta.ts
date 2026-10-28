import type { ComponentMeta } from '@rotra/ui/meta'
export const signOutCardMeta = {
  name: 'SignOutCard',
  description: "The 'Sign out' card: your public profile stays visible, with a danger Sign out button.",
  usage: ['Use at the end of P-PHONE-PRIVACY. Use SignOutSheet for the Queue app sign-out confirmation.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'Privacy and contact (viewAccount)' },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  related: ['PhonePrivacyCard', 'SignOutSheet'],
} satisfies ComponentMeta
