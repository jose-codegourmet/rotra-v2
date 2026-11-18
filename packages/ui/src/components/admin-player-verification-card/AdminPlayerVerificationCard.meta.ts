import type { ComponentMeta } from '@rotra/ui/meta'

export const adminPlayerVerificationCardMeta = {
  name: 'AdminPlayerVerificationCard',
  description:
    "The registered player's status and three automatic checks, with one action to set or clear Verified by Admin.",
  usage: [
    'Place directly below Account in the Admin player Overview tab.',
    'Pass the normalized email and the full phone from Admin account verification; the card shows it grouped, never masked. All three steps stay visible during an override.',
    'Open AdminVerificationOverrideForm from the card action and preserve the action button as the focus target.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Players › Full profile › Overview › Verification',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md#verification'],
  related: ['Card', 'VerificationStep', 'VerificationStatusChip', 'AdminVerificationOverrideForm'],
} satisfies ComponentMeta
