export const rankingSettingsKeys = {
  all: ['ranking-settings'] as const,
  current: () => ['ranking-settings', 'current'] as const,
}
