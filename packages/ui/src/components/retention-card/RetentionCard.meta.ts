import type { ComponentMeta } from '@rotra/ui/meta'

export const retentionCardMeta = {
  name: 'RetentionCard',
  description:
    "Club detail Public pages tab (A-RETENTION): a state chip and the club's public-page countdown (none, restored, stale, due, failed, deleted), then what ends with the license and what is always kept.",
  usage: [
    'retention is a RetentionState computed upstream (A02.8, prototype retention()); the card only formats it.',
    'Only the deleted state says the pages are gone. Due means deletion is in progress and failed means the pages are still online as stale pages.',
    'The stale countdown bar carries an aria-label with elapsed and total days; every state chip has text.',
    'Read-only: there is no Delete club, bulk delete or access bypass here. Deleted pages are not restored by renewing (open decision).',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Public pages › retentionCard()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/flow/license-lifecycle.md',
    'docs/screens/product/open-decisions.md',
  ],
  variants: ['none', 'restored', 'stale', 'due', 'failed', 'deleted'],
  related: ['ProgressBar', 'KeyValueList', 'Chip', 'LicenseStatusCard', 'Card'],
} satisfies ComponentMeta
