import type { ComponentMeta } from '@rotra/ui/meta'

export const pairFacesMeta = {
  name: 'PairFaces',
  description:
    'One pair read only (owner, November 25, 2026): overlapping 26 px pictures with the level ring, then the short names joined by "&" ("Danna & Darryn").',
  usage: [
    'Used on CourtCard (free) for the Next eligible match: PairFaces, "vs", PairFaces; it wraps on a narrow card.',
    'Pictures are decorative (aria-hidden); the names carry the meaning.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'nePair() (.ne-pair) on the free court card',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-upcoming-side-by-side.md',
    'docs/screens/product/modules/queue/session-console.md',
  ],
  variants: ['doubles', 'singles', 'three players'],
  related: ['CourtCard', 'MatchCard', 'Avatar'],
} satisfies ComponentMeta
