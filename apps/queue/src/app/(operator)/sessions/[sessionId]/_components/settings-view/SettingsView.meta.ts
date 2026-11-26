import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsViewMeta = {
  name: 'SettingsView',
  description:
    'The live console\'s Settings tab (the prototype\'s liveSettings()): the Setup heading, one help line and "All session settings" (opens the read-only Q-PREPARE page) then "Back to preparation…" (disabled with its reason as the tooltip once a game has started or offline) at the right; the Courts box (SettingsCourtsBox: From, Until and Follows session end, Extend 30 min / 1 h, Add court); a 2x2 grid of SettingsCards (Game rules with the "Fixed after start" chip | Players, Costs when set | Notes, "No notes for tonight." when empty); the session hosts; then the Session link and Who can join boxes. The tab has no count chip.',
  usage: [
    "Rendered by SessionConsole for ?tab=settings. Add court, Match requests · N and Back to preparation… open the console's own sheets through callbacks (Back to preparation… is disabled with backToPreparationDisabledReason as its title); the Costs card's Payments switches the console to the Payments tab; Add player opens AddPlayer from this view.",
    'Court From, Until and Follows session end save through useUpdateCourt (label kept, the other time kept) and Extend through useExtendSession. The Courts box and its cards toast their own successes; this view only toasts a failure.',
    'Reorder: the Courts box calls onReorder with every live court id in the new order (drag by the ⠿ handle or arrow keys); it saves through useReorderCourts (optimistic) and only a failure toasts here (the box toasts "COURT moved to position N").',
    'Rename: a court label opens the same Change court label dialog as the Courts tab (CourtLabelForm); it saves through useUpdateCourt with the label only (start and end kept) and toasts "OLD is now NEW", or "Court label unchanged".',
    "Chip timers: playingSince is the Playing match's startedAt; freeSince (Free courts only) is the later of openedEarlyAt ?? startsAt ?? the session start and the endedAt of the court's last completed or invalid match. The console's now keeps them moving.",
    'Copy link and the two join switches behave as on the preparation page: toasts from useSetAcceptJoinRequests and useSetAlwaysRequireRequest.',
    'The header Share button lives in SessionConsole (ShareSession).',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-19-queue-console-tabs.md',
  ],
  related: [
    'SessionConsole',
    'SettingsCourtsBox',
    'SettingsCard',
    'SessionLinkCard',
    'SessionHosts',
    'AddPlayer',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
