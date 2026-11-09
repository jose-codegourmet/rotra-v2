import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionJoinQrMeta = {
  name: 'SessionJoinQr',
  description:
    'A thin wrapper over ShareCard (session-join variant). The Session QR share card: fixed dark branding, Post (4:5) and Story (9:16), the club logo or initials inside an H-correction QR, Download image and supported image sharing.',
  usage: [
    'Use inside a Sheet on Q-PREPARE. Pass the visitor public link (/s/<publicSlug>), never the public-page preview URL.',
    'Share only shows where the browser can share an image file.',
    'Club logos that cannot be loaded for canvas export fall back to initials in both the card and PNG.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Preparation › Session QR sheet (sessionQr)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  variants: ['post', 'story', 'logo', 'initials'],
  related: ['ShareCard', 'SessionLinkCard', 'ClubLogo', 'SegmentedControl'],
} satisfies ComponentMeta
