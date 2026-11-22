import type { ComponentMeta } from '@rotra/ui/meta'

export const transferLinkSheetMeta = {
  name: 'TransferLinkSheet',
  description:
    'The single-claim transfer link a confirmed player made for a recipient with no ROTRA account: a QR of the link, the Transfer link copy field and Share or Copy link. Shown once, right after the link is made.',
  usage: [
    'Pass the full link built with transferLinkUrl(origin, slug, token); the token is returned once by Create a transfer link and never stored.',
    'Pass onShare only where navigator.share exists; otherwise the footer shows Copy link.',
    'The caller shows the copy toast (“Transfer link copied”) or the clipboard fallback.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › My night › Transfer my slot › Transfer link (SHEETS.transferLink)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['Sheet', 'CopyField', 'PlayerIdQr', 'SlotTransferForm', 'TransferLinkCard'],
} satisfies ComponentMeta
