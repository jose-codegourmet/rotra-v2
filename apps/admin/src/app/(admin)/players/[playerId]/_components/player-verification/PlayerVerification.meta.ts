import type { ComponentMeta } from '@rotra/ui/meta'

export const playerVerificationMeta = {
  name: 'PlayerVerification',
  description:
    'Wires the registered player Verification card and audited set/clear confirmation to the verification hooks.',
  usage: [
    'Place directly below Account in the Overview tab of the Admin player detail.',
    'Uses the verification revision shown when the sheet opens. A refused write leaves the reason in the sheet.',
    'The mutation invalidates the Admin player, Player verification and record of actions queries.',
  ],
  docs: ['docs/screens/product/modules/admin/players-requests.md#verification'],
  related: ['AdminPlayerVerificationCard', 'AdminVerificationOverrideForm'],
} satisfies ComponentMeta
