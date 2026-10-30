import type { ComponentMeta } from '@rotra/ui/meta'

export const rankingSettingsFormMeta = {
  name: 'RankingSettingsForm',
  description:
    "A-RANK-CONFIG › Edit: the club assessment and match performance weights of every player's shared rank, their split and total, and the recent complete standard matches needed for the overall leaderboard.",
  usage: [
    'The container keeps the draft (values + onChange) so it survives a failed save or a conflict, and passes the effective version as baseline; build both with rankingSettingsDraftFrom (/default-values).',
    'Weights are whole percentages that must total exactly 100 (70/40 is rejected on the total); the requirement is a whole number from 1 to 40. The rule is rankingSettingsField in @rotra/schema/ranking-settings.',
    'Review changes is on only when the draft differs from the baseline, is valid and locked is false; onSubmit opens the Save configuration? sheet (D-CONFIG) with ConfigDiff. The form never saves.',
    'Discard draft calls onDiscard; the container asks before discarding. Pass locked while a ConfigConflictNotice is shown, and serverError after a failed save.',
    'The three-month lookback, the five-session award requirement and equal club weighting are not editable here.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-RANK-CONFIG › viewConfig Edit card (cfgCheck, cfgDirty)',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
    'docs/business_logic/product/admin/modules/configuration/README.md#agreed-adjustable-settings',
  ],
  variants: ['effective', 'dirty', 'invalid total', 'invalid threshold', 'locked', 'server error'],
  related: ['WeightSplitBar', 'ConfigDiff', 'ConfirmSheet'],
} satisfies ComponentMeta
