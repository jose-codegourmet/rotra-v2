import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionJoinQrMeta = {
  name: 'SessionJoinQr',
  description:
    'The Session QR body: a scannable QR of the public session link (always dark on light), the session title line, the link, Download QR image and Share.',
  usage: [
    'Use inside a Sheet on Q-PREPARE. Pass the visitor public link (/s/<publicSlug>), never the public-page preview URL.',
    'Share only shows where the browser can share an image file.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Preparation › Session QR sheet (sessionQr)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionLinkCard', 'PlayerIdQr'],
} satisfies ComponentMeta
