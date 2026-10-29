import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseSheetMeta = {
  name: 'LicenseSheet',
  description:
    'A-LICENSE / D-LICENSE container: a Sheet titled "{Activate|Renew} license" with a local form → review → (no reply → Check status) flow over LicenseForm, LicenseReview and LicenseOperationNotice, saving with useActivateLicense.',
  usage: [
    'Mounted by ClubDetail; Activate/Renew license on the License tab (LicenseStatusCard onOpenLicense) opens it once the terms have loaded. Pass club, terms, open and onOpenChange.',
    'The details start from defaultLicenseDraft (latest plan, the placeholder renewal start, paid today, that plan\'s price). The review takes its term end from termEnd and its effects and overlap from licenseEffects and overlapDays. Back returns to the details with every value kept.',
    'The verb is Renew when the club has any recorded term, else Activate, and stays fixed from the review on (a lost reply can record the term while the notice is up).',
    'Save sends one sourceCommandId generated on entering review and reused by every save of it. Success closes and toasts "License {activated|renewed} until {date}."; any other failure stays on review with serverError and an error toast.',
    'A MockError of kind \'timeout\' shows LicenseOperationNotice with no close button; Check status uses useCheckLicenseOperation with the same sourceCommandId. Found: close and toast "Found it: license {activated|renewed} until {date}. Nothing was added twice." Not found: back to review with "It wasn\'t saved. You can save it again."',
    'The discard prompt, offline blocking and pending-close rules (A02.14) are not wired yet.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'SHEETS.license; licStart, licCommit, ACT.licReview / licEdit / licSave / licCheck',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md', 'docs/screens/product/dialogs.md'],
  related: ['Sheet', 'LicenseForm', 'LicenseReview', 'LicenseOperationNotice', 'SheetSteps', 'Toaster'],
} satisfies ComponentMeta
