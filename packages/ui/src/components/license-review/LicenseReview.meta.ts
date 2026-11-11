import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseReviewMeta = {
  name: 'LicenseReview',
  description:
    'A-LICENSE step 2 (D-LICENSE): the club, plan, period covered, payment, Reference ("LIC number assigned when saved") and the typed Note to check, what the license does to access and public pages, and Activate license or Renew license.',
  usage: [
    "The container passes the LicenseForm values with the term end (getTermEnd), the club's price for the plan, and the effects lines (rotra-admin.html licEffects, from the @rotra/data license rules). The period is computed (D-2026-11-11-06): a renewal starts the day after the current term ends, otherwise today. reference is the owner-typed note.",
    'verb is Activate for a club with no recorded term, Renew otherwise; the primary button reads "{verb} license".',
    'No overlap warning: renewals stack after the current term (D-2026-11-11-06). No refund control.',
    'Payment happened outside ROTRA: the Paid row records what the club paid; nothing here collects money.',
    'While isPending, the primary reads "Saving…" and both buttons are disabled. A lost reply shows LicenseOperationNotice instead of this step; Check status returning nothing comes back here with serverError.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-LICENSE › SHEETS.license (review step), licEffects()',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-license--manual-activationrenewal',
    'docs/screens/product/modules/admin/clubs-licenses.md#a-license--activate-or-renew-after-external-payment',
    'docs/mockup-changes/2026-11-11-admin-license-no-start-date.md',
  ],
  variants: [
    'activate',
    'renew',
    'amount differs',
    'renew deleted',
    'free',
    'saving',
    'server error',
  ],
  related: ['LicenseForm', 'LicenseOperationNotice', 'SheetSteps', 'KeyValueList'],
} satisfies ComponentMeta
