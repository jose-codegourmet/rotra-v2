import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseOperationNoticeMeta = {
  name: 'LicenseOperationNotice',
  description:
    'The License sheet when saving got no reply: the activation or renewal may already be saved, so Check status comes before trying again and the club is never given two periods.',
  usage: [
    "Show it in place of LicenseReview when the save timed out. The sheet can't be closed while it shows (no close button, as the prototype).",
    'Check status recovers the operation result (A02.12): found → the container closes the sheet with a toast; not found → back to LicenseReview with "It wasn\'t saved. You can save it again."',
    'While isChecking, the button reads "Checking…" and is disabled.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-LICENSE › SHEETS.license (timeout / checking step), licCheck',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-license--manual-activationrenewal',
    'docs/business_logic/product/admin/modules/clubs-licenses/flow/license-lifecycle.md',
  ],
  variants: ['timeout', 'checking'],
  related: ['LicenseReview', 'LicenseForm', 'Notice'],
} satisfies ComponentMeta
