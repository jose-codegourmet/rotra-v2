import type { ComponentMeta } from '@rotra/ui/meta'
export const publicAwardsMeta = {
  name: 'PublicAwards',
  description:
    'The Awards section of a finished session’s page: Share awards, the MVP and Most Improved cards side by side, a shared Off Day with Share Off Day, and the footnote.',
  usage: [
    'Details tab of a finished session whose results are shared; it replaces the embedded Awards and Off Day slides there.',
    'Off Day shows only when the club included it in the publication (`offDay` not null).',
    'Each card shares its own image; the section buttons share the whole set.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Details › Awards (pubAwards, .aw-sec)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-queue-awards-faces-share.md',
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
  ],
  related: ['AwardCard', 'AwardShareCard', 'AwardsSlide'],
} satisfies ComponentMeta
