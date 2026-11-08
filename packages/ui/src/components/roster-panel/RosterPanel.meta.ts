import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterPanelMeta = {
  name: 'RosterPanel',
  description:
    'The preparation "Roster and levels" panel: Mark all present / absent and Add player, the SlotMeter, the missing-level warning, level tabs with counts, Group by, the icon List | Grid toggle ("List view" / "Grid view"), and one RosterRow or RosterCard per confirmed slot.',
  usage: [
    'A player presencePending flag passes Saving presence… through RosterRow and RosterCard without disabling switches or the roster.',
    'Active Session settings passes readOnly to show locked levels and presence text; only Add player remains available.',
    'Use for the Roster and levels tab of a prepared Queue Session (Q-PREPARE).',
    'Mark all present shows only while someone is not present; Mark all absent only while someone is present.',
    'Level tabs are All, Advanced, Intermediate, Beginner, and No level only while someone has none. Group by Skill group is offered on All only and shows the SkillDistributionBar above the groups.',
    'List is RosterRow; Grid is RosterCard. Tab, Group by and view can be controlled, or they stay on this component until the screen remembers them on the device.',
    'paid and returning are optional player flags for Group by Payment and Returning or first time; omit them until those are wired.',
    'Do not use in the live console: Queue › Players shows locked levels and no remove action.',
    'Pass loading while the roster query runs: the panel shows Skeleton rows, never a spinner or fake names. levelsLocked turns every level into locked text.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › viewPrepare() roster tab',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-06-queue-roster-views.md',
    'docs/mockup-changes/2026-11-08-queue-roster-view-toggle-icons.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['RosterRow', 'RosterCard', 'SlotMeter', 'WaitlistPanel', 'Notice', 'EmptyState'],
} satisfies ComponentMeta
