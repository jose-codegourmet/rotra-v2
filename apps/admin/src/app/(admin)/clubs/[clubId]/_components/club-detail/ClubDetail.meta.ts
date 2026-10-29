import type { ComponentMeta } from '@rotra/ui/meta'

export const clubDetailMeta = {
  name: 'ClubDetail',
  description:
    'A-CLUB-DETAIL container: useAdminClub, useLicenseTerms and useAuditEvents for one club, a DetailHero, and Tabs (Overview, License, Public pages, Activity) held in ?tab with badges for a pending name change, a public-page countdown or failed deletion, and the audit count.',
  usage: [
    'Rendered by /clubs/[clubId], which awaits params and searchParams tab (overview | license | pages | activity; Overview when absent) and from (the directory query) and passes them in. Switching tabs router.replaces ?tab and keeps from.',
    'Back goes to /clubs plus from, restoring the directory search and filter.',
    '/clubs/{id}?tab=overview#name-request scrolls to the NameChangeRequestCard once the club has loaded.',
    'License tab: Activate/Renew license opens LicenseSheet (once the terms have loaded) and Change price opens ClubPriceSheet; both mount after the Tabs.',
    'Name change Approve/Reject (A02.13) and the loading, not-found and error states (A02.14) are not wired yet.',
  ],
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: [
    'Breadcrumb',
    'DetailHero',
    'Tabs',
    'NameChangeRequestCard',
    'ClubAccountCard',
    'ClubIdentityCard',
    'ActiveSessionCard',
    'LicenseStatusCard',
    'ClubPriceCard',
    'LicenseSheet',
    'ClubPriceSheet',
    'DataTable',
    'RetentionCard',
    'ActivityLog',
  ],
} satisfies ComponentMeta
