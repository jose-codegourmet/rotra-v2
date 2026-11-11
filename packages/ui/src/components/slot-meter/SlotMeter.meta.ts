import type { ComponentMeta } from '@rotra/ui/meta'

export const slotMeterMeta = {
  name: 'SlotMeter',
  description:
    'The slots meter on the roster: "N/M slots · N left before the waitlist" (accent), amber when 2 or fewer are left, "Full · new players go on the waitlist", "N over budget …", plus the waitlist count.',
  usage: [
    'Use in preparation and live Players; pass live for advisory counts and direct admission copy. The bar is a role=meter.',
    'Pass skillCounts for the one-box summary: one bar spanning the slot budget, colored player segments by skill group (SkillMixSegment, hover or focus shows "Beginner: 4 players") then a grey open-slots remainder ("10 open slots", never pressable). Over budget there is no remainder and the segments fill the bar.',
    'With skillCounts the line follows rosterSummary(): past capacity the count turns amber and reads "N over capacity · new players go on the waitlist" (#735); pass expectedGames ({ low, high }, from expectedGames() in @rotra/data) for "· expected games about LOW–HIGH each", recomputed on every roster count change.',
    'Pass onLevelPress to make each player segment a button; it reports the level (beginner, intermediate, advanced, unrated). activeLevel keeps that segment full and dims the other player segments (the open-slots segment stays as is). Pressing the active segment reports the same level again: the parent decides to clear it (show All).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-PREPARE › slotMeter() (.slot-meter); Roster and levels › rosterSummary() (.roster-sum)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/screens/product/modules/queue/session-setup.md',
  ],
  variants: [
    'ok',
    'near',
    'full',
    'over',
    'active',
    'skill-mix',
    'level-active',
    'over capacity with expected games',
  ],
  related: ['RosterPanel', 'WaitlistPanel'],
} satisfies ComponentMeta
