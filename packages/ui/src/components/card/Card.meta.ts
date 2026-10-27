import type { ComponentMeta } from '@rotra/ui/meta'

export const cardMeta = {
  name: 'Card',
  description: 'A bordered surface panel that groups related content on a page.',
  usage: [
    'Use for page sections and summary panels. Product cards (MatchCard, CourtCard, VenueCard) are their own components built on the same look.',
    'tone="highlight" marks the current or chosen item; tone="warn" marks one waiting on someone.',
    'padding="row" holds one ListRow; padding="none" for tables and edge-to-edge lists.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Shared styles › .card (.hl, .li); rotra-admin.html › .card.warnc',
  },
  variants: ['default', 'highlight', 'warn', 'padding:default', 'padding:row', 'padding:none'],
  related: ['ListRow', 'KeyValueList'],
} satisfies ComponentMeta
