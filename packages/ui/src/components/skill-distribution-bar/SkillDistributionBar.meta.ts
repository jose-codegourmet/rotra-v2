import type { ComponentMeta } from '@rotra/ui/meta'

export const skillDistributionBarMeta = {
  name: 'SkillDistributionBar',
  description:
    'A small "Skill mix" label over one compact bar: a segment per skill group sized by head count, ordered Beginner, Intermediate, Advanced, No level. No legend, no rows, no green. Hover or focus a segment for its count.',
  usage: [
    'Pass counts only; the component never receives player data, so the public page can pass aggregate counts.',
    'Zero-count groups are left out. No level shows only when unrated is above zero.',
    'Colors are the level tokens (bg-lv-beg, bg-lv-int, bg-lv-adv, bg-lv-none); both themes ship.',
    'Each segment is a focusable image whose label is its count ("Beginner: 4 players", "1 with no level"); the tooltip shows the same text on hover and focus.',
    'With no players the label sits over a muted empty track with "No players yet".',
    'Reuse the segment math from @rotra/ui/skill-mix (skillMixSegments) and the segment from @rotra/ui/skill-mix-segment (SkillMixSegment, pressable with onClick) instead of copying them.',
    'Shown under the slots meter on the roster tab, and on the public session page.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › skillMix() on the Roster and levels tab',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-07-queue-roster-skill-mix-bar.md',
    'docs/mockup-changes/2026-11-08-queue-roster-skill-mix-progress.md',
  ],
  related: ['RosterPanel', 'LevelPill', 'SlotMeter'],
} satisfies ComponentMeta
