import type { ComponentMeta } from '@rotra/ui/meta'
export const adminWorkspaceShellMeta = {
  name: 'AdminWorkspaceShell',
  description:
    'Owner-only Admin shell, current navigation, account identity, offline band and shared direct sign-out from the header or rail.',
  usage: ['Wrap Admin routes; counts arrive with A02–A04 and are omitted until their data exists.'],
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  related: ['AppShell', 'AdminNav', 'AdminAccountBadge', 'AdminOfflineBand'],
} satisfies ComponentMeta
