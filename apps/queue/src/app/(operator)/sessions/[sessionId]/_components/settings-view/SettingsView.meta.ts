import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsViewMeta = {
  name: 'SettingsView',
  description:
    'The live console\'s Settings tab (the prototype\'s liveSettings()): the Setup heading, one help line and "All session settings" (opens the read-only Q-PREPARE page) at the right; the Courts box (SettingsCourtsBox: From, Until and Follows session end, Extend 30 min / 1 h, Add court); a 2x2 grid of SettingsCards (Game rules with the "Fixed after start" chip | Players, Costs when set | Notes, "No notes for tonight." when empty); the session hosts; then the Session link and Who can join boxes. The tab has no count chip.',
  usage: [
    "Rendered by SessionConsole for ?tab=settings (the old ?tab=payments also lands here). Add court, Match requests · N and Payments open the console's own sheets through callbacks; Add player opens AddPlayer from this view.",
    'Court From, Until and Follows session end save through useUpdateCourt (label kept, the other time kept) and Extend through useExtendSession. The Courts box and its cards toast their own successes; this view only toasts a failure.',
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
