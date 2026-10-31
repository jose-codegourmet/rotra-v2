import type { ComponentMeta } from '@rotra/ui/meta'

export const weightSplitBarMeta = {
  name: 'WeightSplitBar',
  description:
    "A-RANK-CONFIG: the club assessment and match performance shares of a player's shared rank as one bar of two segments.",
  usage: [
    'RankingSettingsForm draws it under the two weight fields from the draft; pass whole percentages.',
    'The segments are drawn only when the two weights total exactly 100; any other total leaves an empty track, and the form shows the total error.',
    'It is role=img with the label "Assessment {a} percent, performance {p} percent", so the split is never shown by colour alone.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-RANK-CONFIG › viewConfig .split',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
  ],
  variants: ['70/30', 'uneven', 'invalid total (empty)'],
  related: ['RankingSettingsForm', 'ProgressBar'],
} satisfies ComponentMeta
