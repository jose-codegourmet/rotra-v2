import type { ComponentMeta } from '@rotra/ui/meta'

export const licenseStatusCardMeta = {
  name: 'LicenseStatusCard',
  description:
    "Club detail License tab: the club's access (active until, ended, starts, never licensed), its plan, and Activate license or Renew license.",
  usage: [
    'access is a ClubAccessState computed upstream (A02.8); the card only formats it.',
    'The button reads Activate license when the club has no recorded terms, else Renew license; it renders only when onOpenLicense is passed and opens the License sheet.',
    'Pass today ("YYYY-MM-DD") in stories and tests so the expired "N days ago" is stable.',
    'There is no access bypass here: access changes only by recording a term.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › License › panels.license (first card)',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/flow/license-lifecycle.md',
  ],
  variants: ['active', 'expired', 'expired with next term', 'scheduled', 'never licensed'],
  related: ['KeyValueList', 'LicenseAccessChip', 'ClubPriceCard', 'Card'],
} satisfies ComponentMeta
