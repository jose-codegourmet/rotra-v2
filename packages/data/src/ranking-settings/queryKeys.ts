export const rankingSettingsKeys = {
  all: ['ranking-settings'] as const,
  /** The effective version in the RankingSettings reader shape */
  current: () => ['ranking-settings', 'current'] as const,
  /** A-RANK-CONFIG: the effective version and every saved version */
  policy: () => ['ranking-settings', 'policy'] as const,
}
