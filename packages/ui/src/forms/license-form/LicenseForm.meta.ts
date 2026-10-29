import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseFormMeta = {
  name: 'LicenseForm',
  description:
    'A-LICENSE step 1: record a monthly or yearly license the club paid for outside ROTRA. Plan, term start (its end as a hint), and for a paid club the date paid and amount; a free tester club shows Amount: Free.',
  usage: [
    'Render it as the first step of the "{Activate|Renew} license" sheet; on Review the container keeps the values and shows LicenseReview. The Cancel and Review buttons are part of the step; put it in a Sheet without a footer.',
    'Pass statusLine from licenseStatusLine(access) (@rotra/ui/forms/license-form/helpers), isActive when the club has an active term, the club\'s prices, and getTermEnd from the @rotra/data license rules.',
    'Placeholder (open decision "License stacking/effective dates and refunds", docs/screens/product/open-decisions.md): the container suggests the start as the day after the current term ends, as the prototype does, and an active club sees a note saying the early-renewal rule is undecided. LicenseReview warns about overlaps. There is no refund control.',
    'Payment happened outside ROTRA: there is no checkout, card or gateway field. The amount is filled in from the plan\'s price and follows plan changes until it is typed by hand.',
    'The reference stays optional (up to 40 characters).',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-LICENSE › SHEETS.license (form step), licErrors(), licPlan, licStart()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md#a-license--activate-or-renew-after-external-payment',
    'docs/screens/product/dialogs.md#d-license--manual-activationrenewal',
    'docs/screens/product/open-decisions.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/flow/license-lifecycle.md',
  ],
  variants: ['activate paid', 'renew active', 'renew expired', 'free', 'errors', 'pending', 'server error'],
  related: ['LicenseReview', 'LicenseOperationNotice', 'SheetSteps', 'DatePicker', 'ChoiceGroup', 'Sheet'],
} satisfies ComponentMeta
