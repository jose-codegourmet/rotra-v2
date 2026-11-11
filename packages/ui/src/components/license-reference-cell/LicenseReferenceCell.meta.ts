import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseReferenceCellMeta = {
  name: 'LicenseReferenceCell',
  description:
    'The Reference cell of a license payment history row: the generated LIC-#### number, and under it the owner-typed Note when there is one.',
  usage: [
    'Use as the Reference column cell of the Admin club detail Payment history (licenseNumber = paymentReference, note = notes).',
    'Do not use for the Queue session payments checklist: that is PaymentsChecklist.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › License tab › Payment history (viewClub terms table)',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/mockup-changes/2026-11-11-admin-license-no-start-date.md',
  ],
  related: ['DataTable', 'LicenseForm', 'LicenseReview'],
} satisfies ComponentMeta
