import type { ComponentMeta } from '@rotra/ui/meta'

export const profileVisibilityControlMeta = {
  name: 'ProfileVisibilityControl',
  description:
    'P-PROFILE-PRIVACY › Profile visibility: the three levels Public, Private (default) and Always private as a radio group with helper lines, the saved-state line and any error.',
  usage: [
    'savedVisibility is the confirmed value (public | private | always_private, product terms §12); the choices never show an unconfirmed one.',
    'isPending shows “Saving…” and disables every choice; error shows under the saved line (offline: “Couldn’t save because you’re offline. Your profile is still …”).',
    'The container owns the mutation and the toasts “Your profile is now public / private / always private”; profileVisibilityWord gives the word.',
    'Replaces the single Private profile switch (PrivateContactCard onToggleProfile) on the Player privacy page.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Privacy and contact › Profile visibility (viewAccount, VIS)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-visibility-hide-from-directory.md',
    'docs/screens/product/modules/player-information/identity-privacy.md',
  ],
  variants: ['public', 'private', 'always_private', 'saving', 'error'],
  related: ['RadioChoiceList', 'PlayerInformationCard', 'PhonePrivacyCard'],
} satisfies ComponentMeta
