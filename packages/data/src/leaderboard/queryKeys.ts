export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  pages: () => ['leaderboard', 'pages'] as const,
  search: (query: string) => ['leaderboard', 'search', query.trim().toLowerCase()] as const,
  myPosition: (playerId?: string) =>
    playerId
      ? (['leaderboard', 'my-position', playerId] as const)
      : (['leaderboard', 'my-position'] as const),
}
