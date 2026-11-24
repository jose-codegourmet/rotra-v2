import type { ComponentMeta } from '@rotra/ui/meta'

export const settingsViewMeta = {
  name: 'SettingsView',
  description:
    'The live console\'s Settings tab: SessionSetupCard (courts with their times, formats, requests, mode, scoring, minimum, roster, costs, notes, and the buttons Courts and time, Add player, Match requests · N and Payments), the session hosts, the SessionLinkCard, then "All session settings", which opens the read-only Q-PREPARE page. The tab has no count chip.',
  usage: [
    "Rendered by SessionConsole for ?tab=settings (the old ?tab=payments also lands here). Courts and time, Match requests · N and Payments open the console's own sheets through callbacks; Add player opens AddPlayer from this view.",
    "Payments is a button here and no longer a console tab; the header's Payments button stays.",
    'Copy link and the two join switches behave as on the preparation page: toasts from useSetAcceptJoinRequests and useSetAlwaysRequireRequest.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-19-queue-console-tabs.md',
  ],
  related: [
    'SessionConsole',
    'SessionSetupCard',
    'SessionLinkCard',
    'SessionHosts',
    'AddPlayer',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
