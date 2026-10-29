import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseReviewMeta = {
  name: 'LicenseReview',
  description:
    'A-LICENSE step 2 (D-LICENSE): the club, plan, period covered, payment and reference to check, what the license does to access and public pages, and Activate license or Renew license.',
  usage: [
    'The container passes the LicenseForm values with the term end (getTermEnd), the club\'s price for the plan, the effects lines (rotra-admin.html licEffects, from the @rotra/data license rules) and the overlap in days.',
    'verb is Activate for a club with no recorded term, Renew otherwise; the primary button reads "{verb} license".',
    'Placeholder (open decision "License stacking/effective dates and refunds"): overlapDays > 0 shows the prototype\'s warning that how overlapping terms combine is undecided. No refund control.',
    'Payment happened outside ROTRA: the Paid row records what the club paid; nothing here collects money.',
    'While isPending, the primary reads "Saving…" and both buttons are disabled. A lost reply shows LicenseOperationNotice instead of this step; Check status returning nothing comes back here with serverError.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-LICENSE › SHEETS.license (review step), licEffects()',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-license--manual-activationrenewal',
    'docs/screens/product/modules/admin/clubs-licenses.md#a-license--activate-or-renew-after-external-payment',
    'docs/screens/product/open-decisions.md',
  ],
  variants: ['activate', 'renew overlap', 'amount differs', 'renew deleted', 'free', 'saving', 'server error'],
  related: ['LicenseForm', 'LicenseOperationNotice', 'SheetSteps', 'KeyValueList', 'Notice'],
} satisfies ComponentMeta
