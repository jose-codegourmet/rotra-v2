import type { ComponentMeta } from '@rotra/ui/meta'

export const clubSettingsMeta = {
  name: 'ClubSettings',
  description:
    'Q-CLUB container: ClubSettingsMenu plus the chosen section (ClubIdentityPanel, SessionDefaultsPanel, FacebookPostEditor with PostPreviewSheet, LicensePanel, ThisDevicePanel, ChangePasswordForm) wired to the club mutations, and SignOutSheet.',
  usage: [
    'Rendered by /club-settings/[section]; unknown sections open Club identity. Offline, the page shows only the connection notice.',
    'The phone settings drawer and the main nav drawer never open together (OperatorShell context).',
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md', 'docs/screens/product/dialogs.md'],
  related: ['ClubSettingsMenu', 'SignOutSheet', 'LicensePanel', 'FacebookPostEditor'],
} satisfies ComponentMeta
