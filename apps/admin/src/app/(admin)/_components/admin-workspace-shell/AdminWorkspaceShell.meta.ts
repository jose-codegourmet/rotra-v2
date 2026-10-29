import type { ComponentMeta } from '@rotra/ui/meta'
export const adminWorkspaceShellMeta = {
  name: 'AdminWorkspaceShell',
  description:
    'Owner-only Admin shell, current navigation, account identity, offline band and shared direct sign-out from the header or rail.',
  usage: ['Wrap Admin routes; Clubs and licenses shows the number of clubs (useAdminClubs) and Club names the pending name changes (useClubNameRequests, a warn pill above 0). Other counts arrive with A03–A04 and are omitted until their data exists.'],
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  related: ['AppShell', 'AdminNav', 'AdminAccountBadge', 'AdminOfflineBand'],
} satisfies ComponentMeta
