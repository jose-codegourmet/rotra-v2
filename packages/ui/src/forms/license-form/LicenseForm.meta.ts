import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseFormMeta = {
  name: 'LicenseForm',
  description:
    'A-LICENSE step 1: record a monthly or yearly license the club paid for outside ROTRA. Plan, the computed period read-only as Covers ("Dec 1, 2026 – Dec 31, 2026"; with a current term, "A renewal starts the day after the current term ends."), for a paid club the date paid and amount (a free tester club shows Amount: Free), and an optional Note.',
  usage: [
    'Render it as the first step of the "{Activate|Renew} license" sheet; on Review the container keeps the values and shows LicenseReview. The Cancel and Review buttons are part of the step; put it in a Sheet without a footer.',
    "Pass statusLine from licenseStatusLine(access) (@rotra/ui/forms/license-form/helpers), isActive when the club has an active term, the club's prices, and getTermEnd from the @rotra/data license rules.",
    'D-2026-11-11-06: there is no Term starts field. The container computes defaultValues.startsOn (the day after the current term ends, else today) and the form shows it read-only; no overlap warning or undecided notice. There is no refund control.',
    "Payment happened outside ROTRA: there is no checkout, card or gateway field. The amount is filled in from the plan's price and follows plan changes until it is typed by hand.",
    'The Note (field name reference) stays optional (up to 40 characters); the LIC number is assigned when saved.',
    'onDirtyChange reports whether any field differs from defaultValues; the container asks "Discard this entry?" before closing an edited form.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-LICENSE › SHEETS.license (form step), licErrors(), licPlan, licStart()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md#a-license--activate-or-renew-after-external-payment',
    'docs/screens/product/dialogs.md#d-license--manual-activationrenewal',
    'docs/mockup-changes/2026-11-11-admin-license-no-start-date.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/flow/license-lifecycle.md',
  ],
  variants: [
    'activate paid',
    'renew active',
    'renew expired',
    'free',
    'errors',
    'pending',
    'server error',
  ],
  related: [
    'LicenseReview',
    'LicenseOperationNotice',
    'SheetSteps',
    'DatePicker',
    'LicenseReferenceCell',
    'ChoiceGroup',
    'Sheet',
  ],
} satisfies ComponentMeta
