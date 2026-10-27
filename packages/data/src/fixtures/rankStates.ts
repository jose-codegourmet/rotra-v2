/** Prototype menu scenarios for rank-component stories. */
export const migsRankStates = {
  onLeaderboard: {
    level: 7,
    levelLabel: 'Advanced Low',
    position: 128,
    status: 'On the leaderboard',
    sentence: '128 of 1,284 players on the overall ROTRA leaderboard.',
  },
  belowThreshold: {
    level: 7,
    levelLabel: 'Advanced Low',
    position: null,
    status: 'Provisional',
    sentence: 'No overall position yet. 7 of 10 standard matches in the last three months.',
  },
  needsReassessment: {
    level: 7,
    levelLabel: 'Advanced Low',
    position: null,
    status: 'Needs reassessment',
    sentence: 'A club needs to reassess this rank before it returns to the leaderboard.',
  },
  noRankYet: {
    level: null,
    levelLabel: undefined,
    position: null,
    status: 'Not calculated',
    sentence: 'No rank yet.',
  },
} as const
