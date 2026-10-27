import type { ComponentMeta } from '@rotra/ui/meta'

export const accessGateMeta = {
  name: 'AccessGate',
  description:
    "Q-ACCESS: shown instead of the club dashboard when the club's license has ended, or when ROTRA could not verify it. A live session can still be finished.",
  usage: [
    'status="expired" only when the license is known to have ended: "License expired" chip, no prices and no checkout.',
    'status="unverified" when the license could not be checked; it never says Expired. Its body copy ("ROTRA couldn\'t check your club\'s license right now.") is a PLACEHOLDER: the offline entitlement mechanism is an open decision (business open-decisions › Licensing).',
    'Pass activeSession and onContinueActiveSession when the club has a live session; it may finish and sync it, not start another.',
  ],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Q-ACCESS › viewAccess()' },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md#expiry',
    'docs/business_logic/product/open-decisions.md',
  ],
  variants: ['expired', 'unverified'],
  related: ['ClubLoginForm', 'Card', 'Chip'],
} satisfies ComponentMeta
