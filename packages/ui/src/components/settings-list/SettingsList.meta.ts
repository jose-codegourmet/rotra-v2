import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsListMeta = {
  name: 'SettingsList',
  description: 'The Account and This device cards on the Player Information Settings page.',
  usage: [
    'Render the account card with the Edit profile, Privacy and contact, and Verification actions.',
    'Render the device card with the current theme and its change callback.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-SETTINGS › viewSettings()',
  },
  docs: [
    'docs/screens/product/modules/player-information/README.md',
    'docs/mvp/decisions/2026-11-26.md',
  ],
  variants: ['account', 'device'],
  related: ['AccountPanel', 'Card', 'ListRow', 'Switch'],
} satisfies ComponentMeta
