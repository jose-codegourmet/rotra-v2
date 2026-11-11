import type { ComponentMeta } from '@rotra/ui/meta'

export const playerInformationCardMeta = {
  name: 'PlayerInformationCard',
  description:
    'P-PROFILE-PRIVACY › Player Information: the switch “Hide me from Player Information” (default off) with its helper and the saved-state line.',
  usage: [
    'savedHidden is the confirmed hiddenFromDirectory value; isPending shows “Saving…” and disables the switch; error shows under the saved line.',
    'The container owns the mutation and the toasts “You are now hidden from Player Information” / “Clubs can now find you in Player Information”.',
    'Sits between ProfileVisibilityControl and PhonePrivacyCard.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Privacy and contact › Player Information (viewAccount, sw-dir)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-visibility-hide-from-directory.md',
    'docs/screens/product/modules/player-information/identity-privacy.md',
  ],
  variants: ['on', 'off', 'saving', 'error'],
  related: ['ProfileVisibilityControl', 'PhonePrivacyCard', 'Switch'],
} satisfies ComponentMeta
