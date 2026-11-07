import type { ComponentMeta } from '@rotra/ui/meta'

export const skillDistributionBarMeta = {
  name: 'SkillDistributionBar',
  description:
    'A header (label and player total), one stacked bar of Beginner, Intermediate and Advanced (and No level when someone has none), and a visible legend with counts.',
  usage: [
    'Pass counts only; the component never receives player data, so the public page can pass aggregate counts.',
    'Zero-count segments are left out of the bar and the legend. No level shows only when unrated is above zero.',
    'With no players the header says No players yet over a muted empty track and there is no legend.',
    'The bar is role="img" with a spoken summary; the legend text carries the same numbers so color is never the only signal.',
    'Use in the Roster and levels panel when Group by is Skill group.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › viewPrepare() roster tab, Group by Skill group',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-07-queue-roster-skill-mix-bar.md',
  ],
  related: ['RosterPanel', 'LevelPill', 'SlotMeter'],
} satisfies ComponentMeta
