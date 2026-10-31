import type { ComponentMeta } from '@rotra/ui/meta'

export const publicPreviewBannerMeta = {
  name: 'PublicPreviewBanner',
  description:
    'The strip the operator sees above the public page preview: "Public page preview. What anyone with the session link sees, no sign-in needed." with a Back to Queue app button.',
  usage: [
    'Use only in the operator app, above PublicSessionHero, when the Queue Master previews the public page from preparation, the console or the session record.',
    'Never render it on the real public page. The prototype-only "Guest view (prototype)" copy is not part of the product.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › .proto-bar',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicSessionHero', 'Notice', 'Button'],
} satisfies ComponentMeta
