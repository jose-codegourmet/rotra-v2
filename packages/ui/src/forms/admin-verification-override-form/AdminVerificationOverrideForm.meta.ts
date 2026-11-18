import type { ComponentMeta } from '@rotra/ui/meta'

export const adminVerificationOverrideFormMeta = {
  name: 'AdminVerificationOverrideForm',
  description:
    'The confirmation sheet for setting or clearing Verified by Admin on a registered player.',
  usage: [
    'Pass the player name, RTR ID and status captured when Admin opens the sheet.',
    'The confirmation requires a nonblank reason. The values passed to onSubmit contain the trimmed reason.',
    'Pass isPending while saving and serverError on failure. A failed write keeps the entered reason.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Players › Full profile › Overview › Verification › Set Verified by Admin / Clear override',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md#verification'],
  related: ['AdminPlayerVerificationCard', 'ConfirmSheet', 'VerificationStatusChip', 'Textarea'],
} satisfies ComponentMeta
