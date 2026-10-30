import type { ComponentMeta } from '@rotra/ui/meta'

export const configConflictNoticeMeta = {
  name: 'ConfigConflictNotice',
  description:
    'A-RANK-CONFIG: the error notice when someone else saved a newer ranking settings version while a draft was open, with Use my draft on version {v} and Start over from version {v}.',
  usage: [
    'Show it at the top of Ranking settings when a save meets a newer version. Concurrent edits are never last-write-wins.',
    'onRebase keeps the draft and bases it on currentVersion so it can be reviewed again; onStartOver discards the draft.',
    'While it shows, Review changes stays disabled (RankingSettingsForm locked).',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-RANK-CONFIG › viewConfig() cfgConflict notice',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
    'docs/database_design/product/admin/modules/configuration-requests.md#ranking_policy_versions',
  ],
  variants: ['default'],
  related: ['Notice', 'Button', 'RankingSettingsForm', 'RankingInEffectCard'],
} satisfies ComponentMeta
