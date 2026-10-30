import type { ComponentMeta } from '@rotra/ui/meta'

export const configDiffMeta = {
  name: 'ConfigDiff',
  description:
    'D-CONFIG: the ranking settings in effect against the draft, one row each for Club assessment, Match performance and Leaderboard requirement.',
  usage: [
    "Render it at the top of the Save configuration? sheet. Pass rows in that order with units '%', '%' and ' matches'.",
    'An unchanged row reads "{from}{unit}"; a changed row reads "{from}{unit} → {to}{unit}" and is outlined in the accent colour.',
    'It only shows values. Validation and the total check stay in RankingSettingsForm, so a sheet never opens on an invalid draft.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'D-CONFIG › SHEETS.config .diff',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-config--save-effective-business-settings',
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
  ],
  variants: ['weights changed', 'threshold changed', 'unchanged'],
  related: ['RankingSettingsForm', 'ConfirmSheet', 'ChangeCompare'],
} satisfies ComponentMeta
