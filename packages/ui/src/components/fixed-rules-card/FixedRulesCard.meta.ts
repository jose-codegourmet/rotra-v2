import type { ComponentMeta } from '@rotra/ui/meta'

export const fixedRulesCardMeta = {
  name: 'FixedRulesCard',
  description:
    "A-RANK-CONFIG: the ranking rules that aren't adjustable in Admin (equal club assessments, the three-month window, the five-session award rule, what doesn't count toward the leaderboard requirement).",
  usage: [
    'Render it under the Edit form on Ranking settings. It takes no props: the rules are fixed product rules, not settings.',
    'Keep the wording in step with the business docs; if a rule becomes adjustable it moves to RankingSettingsForm.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-RANK-CONFIG › viewConfig() Fixed rules',
  },
  docs: [
    'docs/screens/product/modules/admin/configuration.md#a-rank-config--agreed-adjustable-business-settings',
    'docs/business_logic/product/admin/modules/configuration/README.md#agreed-adjustable-settings',
  ],
  variants: ['default'],
  related: ['RankingInEffectCard', 'RankingSettingsForm', 'LeaderboardRulesCard'],
} satisfies ComponentMeta
