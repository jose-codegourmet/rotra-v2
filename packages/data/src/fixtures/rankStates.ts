/** Prototype menu scenarios for rank-component stories. */
export const joseRankStates = {
  onLeaderboard: {
    level: 4,
    levelLabel: 'Intermediate Low',
    position: 30,
    status: 'On the leaderboard',
    sentence: '30 of 38 players on the overall ROTRA leaderboard.',
  },
  belowThreshold: {
    level: 4,
    levelLabel: 'Intermediate Low',
    position: null,
    status: 'Provisional',
    sentence: 'No overall position yet. 7 of 10 standard matches in the last three months.',
  },
  needsReassessment: {
    level: 4,
    levelLabel: 'Intermediate Low',
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
