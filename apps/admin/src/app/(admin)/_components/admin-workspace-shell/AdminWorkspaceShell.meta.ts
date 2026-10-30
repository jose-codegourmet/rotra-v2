import type { ComponentMeta } from '@rotra/ui/meta'
export const adminWorkspaceShellMeta = {
  name: 'AdminWorkspaceShell',
  description:
    'Owner-only Admin shell, current navigation, account identity, offline band and shared direct sign-out from the header or rail.',
  usage: [
    'Wrap Admin routes; Clubs and licenses shows the number of clubs (useAdminClubs), Players the number of player identities (useAdminPlayers) and Club names the pending name changes (useClubNameRequests, a warn pill above 0). Other counts arrive with A03–A04 and are omitted until their data exists.',
    'The count reads run only once the session is confirmed as the platform owner (enabled option), never for a signed-out or denied session.',
    'Containers call useDenyOnPermissionError(query errors…): a permission error from any privileged read replaces the workspace with AccessDeniedCard and clears the cache, so no partial data stays on screen.',
  ],
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  related: ['AppShell', 'AdminNav', 'AdminAccountBadge', 'AdminOfflineBand'],
} satisfies ComponentMeta
