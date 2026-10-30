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
    'Overview: Approve name change and Reject on NameChangeRequestCard open ClubNameSheets (D-CLUB-NAME), mounted after the Tabs.',
    'Loading: Breadcrumb + ClubDetailSkeleton (also used by [clubId]/loading.tsx); the payment history shows DataTable skeleton rows and Activity grey bars until their reads answer. No names, prices or counts are invented.',
    'An unknown id (useAdminClub → null) calls notFound(): [clubId]/not-found.tsx shows "Club not found." under the back link.',
    'A failed club, payment history or audit read shows ErrorState with Retry in its place; a permission error from any of them replaces the workspace with the access denial (useDenyOnPermissionError).',
  ],
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: [
    'Breadcrumb',
    'Skeleton',
    'ErrorState',
    'EmptyState',
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
    'ClubNameSheets',
    'DataTable',
    'RetentionCard',
    'ActivityLog',
  ],
} satisfies ComponentMeta
