import type { ComponentMeta } from '@rotra/ui/meta'

export const preparationSettingsMeta = {
  name: 'PreparationSettings',
  description:
    'The Settings tab of the Preparation page (before start only): the Settings heading and help line, then SettingsCards for Date and venue, Courts, Game rules, Costs (only when costs are set) and Notes ("No notes. Notes show on the public session page." when empty). Each card has an Edit button that opens the session editor at its step (1, 1, 2, 3, 3).',
  usage: [
    'Rendered by SessionPreparation for ?tab=settings. No Settings tab exists during play; Overview keeps its read-only summary.',
    'Edit links to /sessions/ID/edit?step=N&from=settings (N is the editor page, 0 to 2); Back, Cancel and a save in the editor return to /sessions/ID/preparation?tab=settings.',
    'Read-only otherwise: nothing here saves; the editor needs an internet connection.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-19-queue-prep-settings-tab.md',
  ],
  related: ['SessionPreparation', 'SessionSetup', 'SettingsCard', 'SettingsView'],
} satisfies ComponentMeta
