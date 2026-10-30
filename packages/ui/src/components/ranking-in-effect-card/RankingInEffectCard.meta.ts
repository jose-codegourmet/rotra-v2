import type { ComponentMeta } from '@rotra/ui/meta'

export const rankingInEffectCardMeta = {
  name: 'RankingInEffectCard',
  description:
    'A-RANK-CONFIG read-only side: the ranking settings version in effect (Live chip, assessment and performance weights, leaderboard requirement, who set it), then a Versions card listing every saved version, newest first.',
  usage: [
    'effective and versions are accepted RankingPolicyVersion records. Never pass draft values: player pages describe what is in effect, not the draft.',
    'Pass versions oldest first, as stored; the card sorts them newest first. Weights are basis points and display as whole percents.',
    'Times read "Oct 29, 7:48 PM" in Asia/Manila, the same as ActivityLog.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-RANK-CONFIG › viewConfig() In effect and Versions',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
    'docs/business_logic/product/admin/modules/configuration/README.md#agreed-adjustable-settings',
    'docs/database_design/product/admin/modules/configuration-requests.md#ranking_policy_versions',
  ],
  variants: ['one version', 'two versions'],
  related: ['ValueTiles', 'ActivityLog', 'Chip', 'FixedRulesCard', 'RankingSettingsForm'],
} satisfies ComponentMeta
